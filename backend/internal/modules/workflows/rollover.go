package workflows

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/google/uuid"
)

// YearRollover (W1) creates next year's academic year, terms, classes and timetable setup from this year's.
type YearRollover struct{}

func (YearRollover) Key() string   { return "year_rollover" }
func (YearRollover) Title() string { return "Yıl devri" }
func (YearRollover) Description() string {
	return "Bu yılın dönemi, sınıfları, sınıf öğretmenleri, kontenjanları ve ders programı ayarlarıyla gelecek eğitim-öğretim yılını oluşturur. Öğrenciler burada taşınmaz; o işlem Sınıf geçme ve sınıf oluşturma akışındadır."
}

func (YearRollover) Steps() []StepInfo {
	return []StepInfo{
		{Key: "read_source", Title: "Bu yılı oku", Tool: ToolReadYears, Phase: "propose"},
		{Key: "read_classes", Title: "Bu yılın sınıflarını oku", Tool: ToolReadClasses, Phase: "propose"},
		{Key: "read_terms", Title: "Bu yılın dönemlerini oku", Tool: ToolReadTerms, Phase: "propose"},
		{Key: "create_year", Title: "Yeni yılı oluştur", Tool: ToolCreateYear, Phase: "apply"},
		{Key: "copy_terms", Title: "Dönemleri kopyala", Tool: ToolCopyTerms, Phase: "apply"},
		{Key: "copy_classes", Title: "Sınıfları sınıf öğretmenleriyle kopyala", Tool: ToolCopyClasses, Phase: "apply"},
		{Key: "copy_timetable_setup", Title: "Ders programı ayarlarını kopyala", Tool: ToolCopyTimetableSetup, Phase: "apply"},
	}
}

func (YearRollover) Inputs(ctx context.Context, s *Store) ([]InputField, error) {
	years, err := s.years(ctx)
	if err != nil {
		return nil, err
	}
	fields := []InputField{
		{Key: "source_year", Label: "Kopyalanacak yıl", Type: "select", Required: true, Options: yearOptions(years)},
		{Key: "label", Label: "Yeni yıl adı", Type: "text", Required: true, Help: "Genellikle takvim yılı, örneğin 2027."},
		{Key: "start_date", Label: "Başlangıç", Type: "date", Required: true},
		{Key: "end_date", Label: "Bitiş", Type: "date", Required: true},
		{Key: "copy_form_teachers", Label: "Sınıf öğretmenlerini koru", Type: "boolean", Default: "false", Help: "Varsayılan olarak kapalıdır; sınıf öğretmenleri genellikle değişir."},
		{Key: "copy_timetable_setup", Label: "Ders programı ayarlarını kopyala", Type: "boolean", Default: "true", Help: "Seviye şubeleri, ders saati çizelgeleri, ders saatleri ve şube rehber öğretmenleri."},
	}
	if cur := currentYear(years); cur != nil {
		fields[0].Default = cur.ID.String()
		if label := nextLabel(cur.Label); label != "" {
			n, _ := strconv.Atoi(label)
			fields[1].Default = label
			fields[2].Default = fmt.Sprintf("%04d-01-01", n)
			fields[3].Default = fmt.Sprintf("%04d-12-31", n)
		}
	}
	return fields, nil
}

func (w YearRollover) Check(ctx context.Context, s *Store, in Inputs) ([]Check, error) {
	var checks []Check
	source, ok := parseID(in["source_year"])
	var classes []YearClass
	var terms []TermInfo
	var sourceYear Year
	if ok {
		var err error
		if sourceYear, err = s.year(ctx, source); err != nil {
			ok = false
		} else if classes, err = s.yearClasses(ctx, source); err != nil {
			return nil, err
		} else if terms, err = s.terms(ctx, source); err != nil {
			return nil, err
		}
	}
	checks = append(checks, Check{Key: "source_classes", Title: "Bu yılın kopyalanacak sınıfları var", OK: ok && len(classes) > 0, Blocking: true, FixPath: "/classes",
		Detail: map[bool]string{true: plural(len(classes), "sınıf", "sınıf") + " bulundu.", false: "Sınıfı olan bir yıl seçin."}[ok && len(classes) > 0]})

	label := strings.TrimSpace(in["label"])
	exists := false
	if label != "" {
		var err error
		if exists, err = s.labelExists(ctx, label); err != nil {
			return nil, err
		}
	}
	checks = append(checks, Check{Key: "label_free", Title: "Yeni yıl adı henüz kullanılmamış", OK: label != "" && !exists, Blocking: true, FixPath: "/academic-years",
		Detail: map[bool]string{true: "Bu adda bir eğitim-öğretim yılı zaten var.", false: ""}[exists]})

	start, okStart := parseDate(in["start_date"])
	end, okEnd := parseDate(in["end_date"])
	checks = append(checks, Check{Key: "dates", Title: "Başlangıç ve bitiş tarihleri geçerli", OK: okStart && okEnd && start.Before(end), Blocking: true})
	if ok && okStart {
		checks = append(checks, Check{Key: "after_source", Title: "Yeni yıl, bu yıl bittikten sonra başlıyor", OK: start.After(sourceYear.End), Detail: "Üst üste binen yıllara izin verilir ama olağan dışıdır."})
	}
	checks = append(checks, Check{Key: "source_terms", Title: "Bu yılın kopyalanacak dönemleri var", OK: len(terms) > 0, FixPath: "/academic-years", Detail: map[bool]string{true: "", false: "Dönemler olmadan yeni yıl dönemleri olmadan başlar; bunları sonra ekleyin."}[len(terms) > 0]})
	return checks, nil
}

func (w YearRollover) Propose(ctx context.Context, s *Store, in Inputs, trace *Trace) (Proposal, string, error) {
	source, _ := parseID(in["source_year"])
	label := strings.TrimSpace(in["label"])
	start, _ := parseDate(in["start_date"])
	end, _ := parseDate(in["end_date"])
	var src Year
	var classes []YearClass
	var terms []TermInfo
	var sections int
	if err := trace.Run(stepByKey(w, "read_source"), func() (string, error) {
		var err error
		src, err = s.year(ctx, source)
		if err == nil {
			sections, err = s.sectionCount(ctx, source)
		}
		return "Kopyalanıyor: " + src.Label, err
	}); err != nil {
		return Proposal{}, "", err
	}
	if err := trace.Run(stepByKey(w, "read_classes"), func() (string, error) {
		var err error
		classes, err = s.yearClasses(ctx, source)
		return plural(len(classes), "sınıf", "sınıf"), err
	}); err != nil {
		return Proposal{}, "", err
	}
	if err := trace.Run(stepByKey(w, "read_terms"), func() (string, error) {
		var err error
		terms, err = s.terms(ctx, source)
		return plural(len(terms), "dönem", "dönem"), err
	}); err != nil {
		return Proposal{}, "", err
	}

	shift := start.Year() - src.Start.Year()
	termRows := make([]Row, len(terms))
	for i, t := range terms {
		termRows[i] = Row{ID: t.ID.String(), Cells: map[string]string{"name": t.Name, "start": fmtDate(t.Start.AddDate(shift, 0, 0)), "end": fmtDate(t.End.AddDate(shift, 0, 0))}}
	}
	copyTeachers := in["copy_form_teachers"] == "true"
	classRows := make([]Row, len(classes))
	for i, c := range classes {
		homeroom := c.Homeroom
		if homeroom == "" {
			homeroom = c.Name + " (yeni)"
		}
		stream := c.StreamName
		if c.StreamGroupName != "" {
			stream += " / " + c.StreamGroupName
		}
		teacher := "Hayır"
		if copyTeachers && c.FormTeacherID != nil {
			teacher = "Evet"
		}
		classRows[i] = Row{ID: c.ID.String(), Group: c.GradeName, Cells: map[string]string{
			"grade": c.GradeName, "class": c.Name, "stream": stream, "medium": c.MediumName, "homeroom": homeroom,
			"capacity": strconv.Itoa(int(c.Capacity)), "form_teacher": teacher, "include": "true",
		}}
	}

	p := Proposal{
		Summary: []Stat{
			{Label: "Yeni yıl", Value: label},
			{Label: "Sınıf", Value: strconv.Itoa(len(classes))},
			{Label: "Dönem", Value: strconv.Itoa(len(terms))},
			{Label: "Seviye şubeleri", Value: map[bool]string{true: strconv.Itoa(sections), false: "Kopyalanmadı"}[in["copy_timetable_setup"] == "true"]},
		},
		Sections: []Section{
			{Key: "year", Title: "Eğitim-öğretim yılı", Columns: []Column{{Key: "label", Label: "Ad", Type: "text"}, {Key: "start", Label: "Başlangıç", Type: "text"}, {Key: "end", Label: "Bitiş", Type: "text"}},
				Rows: []Row{{ID: "year", Cells: map[string]string{"label": label, "start": fmtDate(start), "end": fmtDate(end)}}}},
			{Key: "terms", Title: "Dönemler", Description: "Tarihler tam yıl kadar ileri alınır; Millî Eğitim takvimiyle karşılaştırın.", Columns: []Column{{Key: "name", Label: "Dönem", Type: "text"}, {Key: "start", Label: "Başlangıç", Type: "text"}, {Key: "end", Label: "Bitiş", Type: "text"}}, Rows: termRows},
			{Key: "classes", Title: "Sınıflar", Description: "Yeni yıla alınmasını istemediğiniz sınıfın işaretini kaldırın.", Columns: []Column{
				{Key: "grade", Label: "Sınıf seviyesi", Type: "text"}, {Key: "class", Label: "Sınıf", Type: "text"}, {Key: "stream", Label: "Alan", Type: "text"},
				{Key: "medium", Label: "Öğretim dili", Type: "text"}, {Key: "homeroom", Label: "Sınıf öğretmeni", Type: "text"}, {Key: "capacity", Label: "Kontenjan", Type: "number"},
				{Key: "form_teacher", Label: "Sınıf öğretmeni korundu", Type: "text"}, {Key: "include", Label: "Oluştur", Type: "boolean", Editable: true},
			}, Rows: classRows},
		},
	}
	if len(terms) == 0 {
		p.Warnings = append(p.Warnings, "Bu yılın dönemi yok, bu yüzden yeni yıl dönemleri olmadan başlayacak.")
	}
	return p, "label:" + strings.ToLower(label), nil
}

type rolloverSnapshot struct {
	YearID uuid.UUID `json:"year_id"`
}

func (w YearRollover) Apply(ctx context.Context, tx *Store, in Inputs, p Proposal, _ uuid.UUID, trace *Trace) (json.RawMessage, string, error) {
	source, _ := parseID(in["source_year"])
	label := strings.TrimSpace(in["label"])
	start, _ := parseDate(in["start_date"])
	end, _ := parseDate(in["end_date"])

	var year uuid.UUID
	if err := trace.Run(stepByKey(w, "create_year"), func() (string, error) {
		var err error
		year, err = tx.createYear(ctx, label, start, end)
		return label + " oluşturuldu", err
	}); err != nil {
		return nil, "", err
	}
	if err := trace.Run(stepByKey(w, "copy_terms"), func() (string, error) {
		rows := p.Section("terms").Rows
		for i, r := range rows {
			ts, _ := parseDate(r.Cells["start"])
			te, _ := parseDate(r.Cells["end"])
			if err := tx.createTerm(ctx, year, r.Cells["name"], ts, te, int32(i)); err != nil {
				return "", err
			}
		}
		return plural(len(rows), "dönem", "dönem"), nil
	}); err != nil {
		return nil, "", err
	}
	created := 0
	if err := trace.Run(stepByKey(w, "copy_classes"), func() (string, error) {
		include := map[string]bool{}
		for _, r := range p.Section("classes").Rows {
			include[r.ID] = r.Cells["include"] == "true"
		}
		classes, err := tx.yearClasses(ctx, source)
		if err != nil {
			return "", err
		}
		for _, c := range classes {
			if !include[c.ID.String()] {
				continue
			}
			if in["copy_form_teachers"] != "true" {
				c.FormTeacherID = nil
			}
			if _, err := tx.createClass(ctx, year, c); err != nil {
				return "", fmt.Errorf("sınıf %s: %w", c.Name, err)
			}
			created++
		}
		return plural(created, "sınıf", "sınıf"), nil
	}); err != nil {
		return nil, "", err
	}
	if in["copy_timetable_setup"] == "true" {
		if err := trace.Run(stepByKey(w, "copy_timetable_setup"), func() (string, error) {
			n, err := tx.copyTimetableSetup(ctx, source, year)
			return fmt.Sprintf("%d seviye şubesi, %d ders saati satırı, %d şube rehber öğretmeni", n.Sections, n.SubjectHours, n.SectionHeads), err
		}); err != nil {
			return nil, "", err
		}
	}
	snapshot, _ := json.Marshal(rolloverSnapshot{YearID: year})
	return snapshot, fmt.Sprintf("%s, %s ile oluşturuldu", label, plural(created, "sınıf", "sınıf")), nil
}

var errYearInUse = errors.New("yeni yılda zaten öğrenci, yoklama, ders seçimi veya ders programı var, bu yüzden artık geri alınamaz")

func (YearRollover) Revert(ctx context.Context, tx *Store, snapshot json.RawMessage) error {
	var snap rolloverSnapshot
	if err := json.Unmarshal(snapshot, &snap); err != nil {
		return err
	}
	used, err := tx.yearHasActivity(ctx, snap.YearID)
	if err != nil {
		return err
	}
	if used {
		return errYearInUse
	}
	return tx.deleteYear(ctx, snap.YearID)
}
