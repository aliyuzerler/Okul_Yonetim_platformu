package workflows

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/google/uuid"
)

// Leavers (W2) marks students who finish school, with a leaving date. The final grade is
// ticked by default; for any other grade (for example 11 after O/L) a person ticks who leaves.
type Leavers struct{}

func (Leavers) Key() string   { return "leavers" }
func (Leavers) Title() string { return "Ayrılan öğrenciler" }
func (Leavers) Description() string {
	return "Ayrılan öğrencileri bir ayrılış tarihiyle 'ayrıldı' olarak işaretler. Son sınıf varsayılan olarak işaretlidir; diğer seviyelerdeki öğrencileri elle işaretleyin."
}

func (Leavers) Steps() []StepInfo {
	return []StepInfo{
		{Key: "read_students", Title: "Seçilen seviyelerdeki öğrencileri oku", Tool: ToolReadStudents, Phase: "propose"},
		{Key: "mark_leavers", Title: "İşaretli öğrencileri ayrıldı olarak kaydet", Tool: ToolMarkLeavers, Phase: "apply"},
	}
}

func (Leavers) Inputs(ctx context.Context, s *Store) ([]InputField, error) {
	years, err := s.years(ctx)
	if err != nil {
		return nil, err
	}
	grades, err := s.grades(ctx)
	if err != nil {
		return nil, err
	}
	gradeOptions := make([]Option, len(grades))
	for i, g := range grades {
		gradeOptions[i] = Option{Value: g.ID.String(), Label: g.Name}
	}
	fields := []InputField{
		{Key: "year", Label: "Ayrıldıkları yıl", Type: "select", Required: true, Options: yearOptions(years)},
		{Key: "grades", Label: "Sınıf seviyeleri", Type: "multiselect", Required: true, Options: gradeOptions, Help: "Genellikle son sınıf; O/L sonrası ayrılanları incelemek için 11. sınıfı da ekleyin."},
		{Key: "left_on", Label: "Ayrılış tarihi", Type: "date", Required: true},
	}
	if cur := currentYear(years); cur != nil {
		fields[0].Default = cur.ID.String()
		fields[2].Default = fmtDate(cur.End)
	}
	if len(grades) > 0 {
		fields[1].Default = grades[len(grades)-1].ID.String()
	}
	return fields, nil
}

func (Leavers) Check(ctx context.Context, s *Store, in Inputs) ([]Check, error) {
	_, okYear := parseID(in["year"])
	_, okDate := parseDate(in["left_on"])
	return []Check{
		{Key: "year", Title: "Bir yıl seçilmiş", OK: okYear, Blocking: true},
		{Key: "grades", Title: "En az bir sınıf seviyesi seçilmiş", OK: len(parseIDs(in["grades"])) > 0, Blocking: true},
		{Key: "date", Title: "Ayrılış tarihi geçerli", OK: okDate, Blocking: true},
	}, nil
}

func (w Leavers) Propose(ctx context.Context, s *Store, in Inputs, trace *Trace) (Proposal, string, error) {
	year, _ := parseID(in["year"])
	grades, err := s.grades(ctx)
	if err != nil {
		return Proposal{}, "", err
	}
	finalGrade := uuid.Nil
	if len(grades) > 0 {
		finalGrade = grades[len(grades)-1].ID
	}
	var students []LeaverCandidate
	if err := trace.Run(stepByKey(w, "read_students"), func() (string, error) {
		var err error
		students, err = s.activeStudentsInGrades(ctx, year, parseIDs(in["grades"]))
		return plural(len(students), "aktif öğrenci", "aktif öğrenci"), err
	}); err != nil {
		return Proposal{}, "", err
	}
	rows := make([]Row, len(students))
	ticked := 0
	for i, st := range students {
		leaving := st.GradeID == finalGrade
		reason := "Bu öğrenci ayrılıyorsa işaretleyin."
		if leaving {
			reason = "Son sınıf: varsayılan olarak ayrılıyor."
			ticked++
		}
		rows[i] = Row{ID: st.ID.String(), Group: st.GradeName, Reason: reason, Cells: map[string]string{
			"grade": st.GradeName, "class": st.ClassName, "index": st.Index, "name": st.Name, "leaving": strconv.FormatBool(leaving),
		}}
	}
	p := Proposal{
		Summary: []Stat{{Label: "Listelenen öğrenci", Value: strconv.Itoa(len(rows))}, {Label: "Ayrılmak için işaretli", Value: strconv.Itoa(ticked)}, {Label: "Ayrılış tarihi", Value: in["left_on"]}},
		Sections: []Section{{Key: "students", Title: "Öğrenciler", Description: "İşaretli öğrenciler ayrıldı olarak işaretlenir. Kalacak olanların işaretini kaldırın.", Columns: []Column{
			{Key: "grade", Label: "Sınıf seviyesi", Type: "text"}, {Key: "class", Label: "Sınıf", Type: "text"}, {Key: "index", Label: "Okul no.", Type: "text"},
			{Key: "name", Label: "Ad", Type: "text"}, {Key: "leaving", Label: "Ayrılıyor", Type: "boolean", Editable: true},
		}, Rows: rows}},
	}
	if len(rows) == 0 {
		p.Warnings = append(p.Warnings, "Bu yıl için bu seviyelerde aktif öğrenci bulunamadı.")
	}
	return p, "leavers:" + year.String(), nil
}

type leaversSnapshot struct {
	IDs []uuid.UUID `json:"ids"`
}

func (w Leavers) Apply(ctx context.Context, tx *Store, in Inputs, p Proposal, _ uuid.UUID, trace *Trace) (json.RawMessage, string, error) {
	date, _ := parseDate(in["left_on"])
	var ids []uuid.UUID
	for _, r := range p.Section("students").Rows {
		if r.Cells["leaving"] == "true" {
			if id, ok := parseID(r.ID); ok {
				ids = append(ids, id)
			}
		}
	}
	var marked int64
	if err := trace.Run(stepByKey(w, "mark_leavers"), func() (string, error) {
		var err error
		marked, err = tx.markLeft(ctx, ids, date)
		return fmt.Sprintf("%d öğrenci ayrıldı olarak işaretlendi", marked), err
	}); err != nil {
		return nil, "", err
	}
	snapshot, _ := json.Marshal(leaversSnapshot{IDs: ids})
	return snapshot, fmt.Sprintf("%s ayrıldı olarak işaretlendi", plural(int(marked), "öğrenci", "öğrenci")), nil
}

func (Leavers) Revert(ctx context.Context, tx *Store, snapshot json.RawMessage) error {
	var snap leaversSnapshot
	if err := json.Unmarshal(snapshot, &snap); err != nil {
		return err
	}
	_, err := tx.restoreActive(ctx, snap.IDs)
	return err
}
