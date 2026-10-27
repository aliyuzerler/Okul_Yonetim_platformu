package workflows

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/authz"
	"github.com/openschool-org/openschool/internal/modules/notifications"
)

// GoLive (W8) makes the prepared year current and tells the school.
type GoLive struct {
	notices *notifications.NotificationService
}

func NewGoLive(notices *notifications.NotificationService) GoLive { return GoLive{notices: notices} }

func (GoLive) Key() string   { return "go_live" }
func (GoLive) Title() string { return "Yılı açılışa alma" }
func (GoLive) Description() string {
	return "Yeni yılı ve ilk dönemini güncel yapar, böylece her sayfa ona geçer, ve okula tek bir duyuru gönderir."
}

func (GoLive) Steps() []StepInfo {
	return []StepInfo{
		{Key: "check_readiness", Title: "Sınıfları, öğrencileri ve ders programlarını say", Tool: ToolCheckYearReadiness, Phase: "propose"},
		{Key: "set_current", Title: "Yılı ve ilk dönemi güncel yap", Tool: ToolSetCurrentYear, Phase: "apply"},
		{Key: "notify", Title: "Okula duyur", Tool: ToolNotifySchool, Phase: "apply"},
	}
}

func (GoLive) Inputs(ctx context.Context, s *Store) ([]InputField, error) {
	years, err := s.years(ctx)
	if err != nil {
		return nil, err
	}
	fields := []InputField{
		{Key: "target_year", Label: "Güncel yapılacak yıl", Type: "select", Required: true, Options: yearOptions(years)},
		{Key: "notify", Label: "Herkese duyuru gönder", Type: "boolean", Default: "true"},
	}
	// Years are newest first, so the first non-current one is the year being prepared.
	for _, y := range years {
		if !y.Current {
			fields[0].Default = y.ID.String()
			break
		}
	}
	return fields, nil
}

func (GoLive) Check(ctx context.Context, s *Store, in Inputs) ([]Check, error) {
	target, ok := parseID(in["target_year"])
	var year Year
	var r Readiness
	if ok {
		var err error
		if year, err = s.year(ctx, target); err != nil {
			ok = false
		} else if r, err = s.readiness(ctx, target); err != nil {
			return nil, err
		}
	}
	return []Check{
		{Key: "not_current", Title: "Yıl var ve henüz güncel değil", OK: ok && !year.Current, Blocking: true},
		{Key: "classes", Title: "Yılın sınıfları var", OK: r.Classes > 0, Blocking: true, FixPath: "/year-end/year_rollover", Detail: plural(int(r.Classes), "sınıf", "sınıf")},
		{Key: "students", Title: "Öğrenciler sınıflara yerleştirilmiş", OK: r.Students > 0, FixPath: "/year-end/promotion", Detail: plural(int(r.Students), "öğrenci", "öğrenci") + " yerleştirilmiş"},
		{Key: "timetables", Title: "Her sınıfın yayınlanmış bir ders programı var", OK: r.Classes > 0 && r.PublishedTimetables >= r.Classes, FixPath: "/timetables", Detail: fmt.Sprintf("%d / %d yayınlandı", r.PublishedTimetables, r.Classes)},
		{Key: "terms", Title: "Yılın dönemleri var", OK: r.Terms > 0, FixPath: "/academic-years", Detail: plural(int(r.Terms), "dönem", "dönem")},
	}, nil
}

func (w GoLive) Propose(ctx context.Context, s *Store, in Inputs, trace *Trace) (Proposal, string, error) {
	target, _ := parseID(in["target_year"])
	var year Year
	var r Readiness
	var terms []TermInfo
	var current *Year
	if err := trace.Run(stepByKey(w, "check_readiness"), func() (string, error) {
		var err error
		if year, err = s.year(ctx, target); err != nil {
			return "", err
		}
		if r, err = s.readiness(ctx, target); err != nil {
			return "", err
		}
		if terms, err = s.terms(ctx, target); err != nil {
			return "", err
		}
		years, err := s.years(ctx)
		current = currentYear(years)
		return fmt.Sprintf("%d sınıf, %d öğrenci, %d yayınlanmış ders programı", r.Classes, r.Students, r.PublishedTimetables), err
	}); err != nil {
		return Proposal{}, "", err
	}
	from := "Yok"
	if current != nil {
		from = current.Label
	}
	firstTerm := "Yok"
	if len(terms) > 0 {
		firstTerm = terms[0].Name
	}
	p := Proposal{
		Summary: []Stat{{Label: "Sınıflar", Value: strconv.Itoa(int(r.Classes))}, {Label: "Yerleştirilen öğrenci", Value: strconv.Itoa(int(r.Students))}, {Label: "Yayınlanan ders programı", Value: fmt.Sprintf("%d / %d", r.PublishedTimetables, r.Classes)}},
		Sections: []Section{{Key: "changes", Title: "Neler değişir", Columns: []Column{{Key: "what", Label: "Ayar", Type: "text"}, {Key: "from", Label: "Şu an", Type: "text"}, {Key: "to", Label: "Sonra", Type: "text"}},
			Rows: []Row{
				{ID: "year", Cells: map[string]string{"what": "Güncel eğitim-öğretim yılı", "from": from, "to": year.Label}},
				{ID: "term", Cells: map[string]string{"what": "Güncel dönem", "from": "-", "to": firstTerm}},
				{ID: "notice", Cells: map[string]string{"what": "Herkese duyuru", "from": "-", "to": map[bool]string{true: "Gönderilir", false: "Gönderilmez"}[in["notify"] == "true"]}},
			}}},
	}
	if r.PublishedTimetables < r.Classes {
		p.Warnings = append(p.Warnings, fmt.Sprintf("%d sınıfın henüz yayınlanmış ders programı yok; öğretmenler ve öğrenciler boş bir ders programı görecek.", r.Classes-r.PublishedTimetables))
	}
	return p, "golive:" + target.String(), nil
}

type goLiveSnapshot struct {
	PreviousYear *uuid.UUID `json:"previous_year"`
	PreviousTerm *uuid.UUID `json:"previous_term"`
}

func (w GoLive) Apply(ctx context.Context, tx *Store, in Inputs, _ Proposal, _ uuid.UUID, trace *Trace) (json.RawMessage, string, error) {
	target, _ := parseID(in["target_year"])
	var snap goLiveSnapshot
	var label string
	if err := trace.Run(stepByKey(w, "set_current"), func() (string, error) {
		years, err := tx.years(ctx)
		if err != nil {
			return "", err
		}
		if cur := currentYear(years); cur != nil {
			snap.PreviousYear = &cur.ID
		}
		if snap.PreviousTerm, err = tx.currentTerm(ctx); err != nil {
			return "", err
		}
		year, err := tx.year(ctx, target)
		if err != nil {
			return "", err
		}
		label = year.Label
		if err := tx.setCurrentYear(ctx, target); err != nil {
			return "", err
		}
		terms, err := tx.terms(ctx, target)
		if err != nil {
			return "", err
		}
		if len(terms) > 0 {
			if err := tx.setCurrentTerm(ctx, terms[0].ID); err != nil {
				return "", err
			}
		}
		return label + " artık güncel", nil
	}); err != nil {
		return nil, "", err
	}
	data, _ := json.Marshal(snap)
	return data, label + " artık güncel eğitim-öğretim yılı", nil
}

// AfterApply sends the notice once the switch has committed; a failure never undoes the switch.
func (w GoLive) AfterApply(ctx context.Context, s *Store, in Inputs, actor uuid.UUID) error {
	if in["notify"] != "true" || w.notices == nil {
		return nil
	}
	target, _ := parseID(in["target_year"])
	year, err := s.year(ctx, target)
	if err != nil {
		return err
	}
	_, err = w.notices.Create(ctx, notifications.CreateNotificationRequest{
		Title:          year.Label + " eğitim-öğretim yılı başladı",
		Message:        year.Label + " yılı sınıfları ve ders programları artık OpenSchool'de yayında.",
		Category:       "general",
		Priority:       "normal",
		RecipientRules: []notifications.RecipientRule{{Type: notifications.RuleEveryone, Label: "Herkese"}},
	}, actor, authz.RoleAdmin)
	return err
}

func (GoLive) Revert(ctx context.Context, tx *Store, snapshot json.RawMessage) error {
	var snap goLiveSnapshot
	if err := json.Unmarshal(snapshot, &snap); err != nil {
		return err
	}
	if snap.PreviousYear != nil {
		if err := tx.setCurrentYear(ctx, *snap.PreviousYear); err != nil {
			return err
		}
	}
	if snap.PreviousTerm != nil {
		return tx.setCurrentTerm(ctx, *snap.PreviousTerm)
	}
	return nil
}
