package workflows

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"

	"github.com/google/uuid"
	timetablemodule "github.com/openschool-org/openschool/internal/modules/timetable"
)

// Timetable (W7) checks the timetable setup, plans option blocks from the subject choices (basket
// and A/L option subjects at the same period across the classes that share them), and generates
// draft timetables for whole grade sections with the existing generator and its repair pass. The
// proposal is a real dry run: the generation runs in a transaction that is rolled back.
type Timetable struct{}

func (Timetable) Key() string   { return "timetable" }
func (Timetable) Title() string { return "Ders programı" }
func (Timetable) Description() string {
	return "Ders programı ayarlarını denetler, sepet ve A/L seçmeli derslerini aynı ders saatinde seçmeli ders blokları olarak sınıflar arasında çalıştırır ve tüm seviye şubeleri için taslak ders programları üretir. Taslaklar ardından her zamanki gibi şube rehber öğretmeni incelemesine gider."
}

var (
	ToolCheckTimetableSetup = tool("check_timetable_setup", "Yılın ders saati çizelgelerini, ders saatlerini, branş öğretmenlerini, laboratuvar dersliklerini, şube rehber öğretmenlerini ve öğretmen müsaitliklerini denetler.", false)
	ToolPlanOptionBlocks    = tool("plan_option_blocks", "Tek seçimli her ders grubunu, öğrencileri o gruptan seçen sınıfları kapsayan bir seçmeli ders bloğuna dönüştürür.", false)
	ToolPreviewTimetables   = tool("preview_timetables", "Üreticiyi geri alınan bir işlem içinde çalıştırır, böylece her sınıfın ne alacağını gösterir.", false)
	ToolSaveOptionBlocks    = tool("save_option_blocks", "Yıl için seçilen seviyelerin seçmeli ders bloklarını değiştirir.", true)
	ToolGenerateTimetables  = tool("generate_timetables", "Seviye şubesi başına taslak ders programı üretir: önce seçmeli ders blokları, sonra dersler, ardından boşluğu kapatmak için bir dersi taşıyan onarım turu.", true)
)

func (Timetable) Steps() []StepInfo {
	return []StepInfo{
		{Key: "check_setup", Title: "Ders programı ayarlarını denetle", Tool: ToolCheckTimetableSetup, Phase: "propose"},
		{Key: "plan_blocks", Title: "Seçmeli ders bloklarını planla", Tool: ToolPlanOptionBlocks, Phase: "propose"},
		{Key: "preview", Title: "Ders programlarını önizle", Tool: ToolPreviewTimetables, Phase: "propose"},
		{Key: "save_blocks", Title: "Seçmeli ders bloklarını kaydet", Tool: ToolSaveOptionBlocks, Phase: "apply"},
		{Key: "generate", Title: "Taslak ders programlarını üret", Tool: ToolGenerateTimetables, Phase: "apply"},
	}
}

func defaultTargetYear(years []Year) *Year {
	cur := currentYear(years)
	if cur == nil {
		return nil
	}
	for i := range years {
		if !years[i].Current && years[i].Start.After(cur.Start) {
			return &years[i]
		}
	}
	return cur
}

func (Timetable) Inputs(ctx context.Context, s *Store) ([]InputField, error) {
	years, err := s.years(ctx)
	if err != nil {
		return nil, err
	}
	var sectionOptions []Option
	var defaults []string
	target := defaultTargetYear(years)
	for _, y := range years {
		secs, err := s.sections(ctx, y)
		if err != nil {
			return nil, err
		}
		for _, sec := range secs {
			sectionOptions = append(sectionOptions, Option{Value: sec.ID.String(), Label: y.Label + ": " + sec.Name})
			if target != nil && y.ID == target.ID {
				defaults = append(defaults, sec.ID.String())
			}
		}
	}
	fields := []InputField{
		{Key: "target_year", Label: "Ders programı yılı", Type: "select", Required: true, Options: yearOptions(years)},
		{Key: "sections", Label: "Seviye şubeleri", Type: "multiselect", Required: true, Options: sectionOptions, Default: strings.Join(defaults, ","), Help: "Ders programı incelemeye gönderilmiş veya yayınlanmış sınıflara dokunulmaz."},
		{Key: "blocks", Label: "Sepet ve A/L seçmeli derslerini seçmeli ders blokları olarak çalıştır", Type: "boolean", Default: "true", Help: "Gelecek yılın ders seçimlerinin girilmiş olmasını gerektirir."},
	}
	if target != nil {
		fields[0].Default = target.ID.String()
	}
	return fields, nil
}

// timetableScope resolves the chosen year and the sections of that year among the chosen ones.
func (Timetable) scope(ctx context.Context, s *Store, in Inputs) (*Year, []SectionInfo, error) {
	id, ok := parseID(in["target_year"])
	if !ok {
		return nil, nil, nil
	}
	year, err := s.year(ctx, id)
	if err != nil {
		return nil, nil, nil
	}
	all, err := s.sections(ctx, year)
	if err != nil {
		return nil, nil, err
	}
	chosen := map[uuid.UUID]bool{}
	for _, sid := range parseIDs(in["sections"]) {
		chosen[sid] = true
	}
	var out []SectionInfo
	for _, sec := range all {
		if chosen[sec.ID] {
			out = append(out, sec)
		}
	}
	return &year, out, nil
}

func (w Timetable) Check(ctx context.Context, s *Store, in Inputs) ([]Check, error) {
	year, sections, err := w.scope(ctx, s, in)
	if err != nil {
		return nil, err
	}
	checks := []Check{
		{Key: "year", Title: "Bir yıl seçilmiş", OK: year != nil, Blocking: true},
		{Key: "sections", Title: "O yıldan en az bir seviye şubesi seçilmiş", OK: len(sections) > 0, Blocking: true, FixPath: "/grade-sections"},
	}
	if year == nil || len(sections) == 0 {
		return checks, nil
	}
	var noGrid, noHead []string
	chosen := map[uuid.UUID]bool{}
	for _, sec := range sections {
		chosen[sec.ID] = true
		if sec.Periods == 0 {
			noGrid = append(noGrid, sec.Name)
		}
		if !sec.HasHead {
			noHead = append(noHead, sec.Name)
		}
	}
	classes, err := s.sectionClasses(ctx, year.ID)
	if err != nil {
		return nil, err
	}
	hours, err := s.subjectHours(ctx, year.ID)
	if err != nil {
		return nil, err
	}
	assigned, err := s.yearSubjectTeachers(ctx, year.ID)
	if err != nil {
		return nil, err
	}
	labs, err := s.subjectsMissingLabs(ctx, year.ID)
	if err != nil {
		return nil, err
	}
	withAvailability, err := s.teachersWithAvailability(ctx, year.ID)
	if err != nil {
		return nil, err
	}
	hoursByGrade := map[uuid.UUID]int{}
	for _, h := range hours {
		hoursByGrade[h.GradeID]++
	}
	has := map[[2]uuid.UUID]bool{}
	for _, a := range assigned {
		has[[2]uuid.UUID{a.ClassID, a.SubjectID}] = true
	}
	inScope, missingTeacher := 0, 0
	gradesWithout := map[string]bool{}
	for _, c := range classes {
		if !chosen[c.SectionID] {
			continue
		}
		inScope++
		if hoursByGrade[c.GradeID] == 0 {
			gradesWithout[c.GradeName] = true
		}
		for _, h := range hours {
			if h.GradeID == c.GradeID && !has[[2]uuid.UUID{c.ClassID, h.SubjectID}] {
				missingTeacher++
			}
		}
	}
	var gradeNames []string
	for g := range gradesWithout {
		gradeNames = append(gradeNames, g)
	}
	sort.Strings(gradeNames)
	checks = append(checks,
		Check{Key: "grids", Title: "Her şubenin ders saati çizelgesi var", OK: len(noGrid) == 0, Blocking: true, FixPath: "/grade-sections", Detail: listDetail("Eksik:", noGrid)},
		Check{Key: "classes", Title: "Şubelerin sınıfları var", OK: inScope > 0, Blocking: true, FixPath: "/year-end/year_rollover", Detail: plural(inScope, "sınıf", "sınıf")},
		Check{Key: "hours", Title: "Her seviyenin ders saatleri var", OK: len(gradeNames) == 0, Blocking: len(gradeNames) > 0 && len(gradeNames) == len(gradesInScope(classes, chosen)), FixPath: "/subject-requirements", Detail: listDetail("Eksik:", gradeNames)},
		Check{Key: "teachers", Title: "Her sınıf dersinin bir öğretmeni var", OK: missingTeacher == 0, FixPath: "/year-end/teacher_allocation",
			Detail: fmt.Sprintf("%s öğretmensiz; sınıf öğretmeni atanmışsa o kullanılır, aksi hâlde boşluk bırakılır.", plural(missingTeacher, "sınıf dersi", "sınıf dersi"))},
		Check{Key: "labs", Title: "Laboratuvar ders saati olan derslerin laboratuvar dersliği var", OK: len(labs) == 0, FixPath: "/classrooms", Detail: listDetail("Laboratuvarı olmayan:", labs)},
		Check{Key: "heads", Title: "Her şubenin inceleme yapacak bir şube rehber öğretmeni var", OK: len(noHead) == 0, FixPath: "/grade-sections", Detail: listDetail("Şube rehber öğretmeni olmayan:", noHead) + " Bunlardan biri olmadan taslaklar incelemeye gönderilemez; yalnızca seviyede sorumlu öğretmen (TIC) varsa bu kural esner."},
		Check{Key: "availability", Title: "Öğretmen müsaitlikleri girilmiş", OK: withAvailability > 0, FixPath: "/teachers", Detail: "İsteğe bağlı. Girilmezse her öğretmen hafta boyunca müsait sayılır."},
	)
	return checks, nil
}

func gradesInScope(classes []SectionClass, chosen map[uuid.UUID]bool) map[uuid.UUID]bool {
	out := map[uuid.UUID]bool{}
	for _, c := range classes {
		if chosen[c.SectionID] {
			out[c.GradeID] = true
		}
	}
	return out
}

func listDetail(prefix string, items []string) string {
	if len(items) == 0 {
		return ""
	}
	return prefix + " " + strings.Join(items, ", ") + "."
}

// planBlocks makes one block per one-pick subject group of each grade in scope, covering the
// classes whose students chose from it. Groups where a student picks several subjects cannot
// share one period and are reported instead.
func (Timetable) planBlocks(ctx context.Context, s *Store, year uuid.UUID, classes []SectionClass, grades map[uuid.UUID]bool) ([]Row, []string, error) {
	levels, err := s.gradeLevels(ctx)
	if err != nil {
		return nil, nil, err
	}
	hours, err := s.subjectHours(ctx, year)
	if err != nil {
		return nil, nil, err
	}
	periods := map[[2]uuid.UUID]int{}
	for _, h := range hours {
		periods[[2]uuid.UUID{h.GradeID, h.SubjectID}] = h.Periods
	}
	className := map[uuid.UUID]SectionClass{}
	for _, c := range classes {
		className[c.ClassID] = c
	}
	var rows []Row
	var notes []string
	for _, l := range levels {
		if !grades[l.GradeID] {
			continue
		}
		groups, err := s.levelGroups(ctx, l.ID)
		if err != nil {
			return nil, nil, err
		}
		for _, g := range groups {
			if g.Fixed() {
				continue
			}
			if g.Max > 1 {
				notes = append(notes, fmt.Sprintf("%s %s: öğrenciler %d ders seçiyor, bu yüzden tek bir seçmeli ders bloğu olarak çalışamaz; dersleri normal dersler olarak programlanır.", l.GradeName, g.Label, g.Max))
				continue
			}
			ids, err := s.groupClasses(ctx, year, g.ID)
			if err != nil {
				return nil, nil, err
			}
			var cls []SectionClass
			for _, id := range ids {
				if c, ok := className[id]; ok && c.GradeID == l.GradeID {
					cls = append(cls, c)
				}
			}
			if len(cls) == 0 {
				continue
			}
			sort.Slice(cls, func(i, j int) bool { return naturalLess(cls[i].ClassName, cls[j].ClassName) })
			most := 0
			var subjectIDs, subjectNames, classIDs, classNames []string
			for _, o := range g.Subjects {
				sid, _ := parseID(o.Value)
				if p := periods[[2]uuid.UUID{l.GradeID, sid}]; p > 0 {
					subjectIDs = append(subjectIDs, o.Value)
					subjectNames = append(subjectNames, o.Label)
					if p > most {
						most = p
					}
				}
			}
			if most == 0 {
				notes = append(notes, fmt.Sprintf("%s %s: hiçbir dersinin ders saati yok, bu yüzden blok planlanmadı.", l.GradeName, g.Label))
				continue
			}
			for _, c := range cls {
				classIDs = append(classIDs, c.ClassID.String())
				classNames = append(classNames, c.ClassName)
			}
			name := g.Label
			if len(levels) > 1 && !strings.Contains(strings.ToLower(g.Label), strings.ToLower(l.Label)) {
				name = l.Label + " " + g.Label
			}
			rows = append(rows, Row{ID: "block:" + l.GradeID.String() + ":" + g.ID.String(), Group: l.GradeName,
				Reason: fmt.Sprintf("Bu sınıflardaki öğrenciler %s grubundan seçim yaptı; bloğun ders saati sayısı, dersleri arasından en yüksektir.", g.Label),
				Cells: map[string]string{"grade": l.GradeName, "name": name, "subjects": strings.Join(subjectNames, ", "), "classes": strings.Join(classNames, ", "),
					"periods": strconv.Itoa(most), "create": "true", "grade_id": l.GradeID.String(), "subject_ids": strings.Join(subjectIDs, ","), "class_ids": strings.Join(classIDs, ",")}})
		}
	}
	return rows, notes, nil
}

// build saves the ticked blocks (replacing the grades' old ones) and generates every chosen section.
func (w Timetable) build(ctx context.Context, tx *Store, year Year, sections []SectionInfo, blockRows []Row, useBlocks bool, actor uuid.UUID) (timetableSnapshot, []timetablemodule.ClassGenerationResult, error) {
	snap := timetableSnapshot{Year: year.ID}
	classes, err := tx.sectionClasses(ctx, year.ID)
	if err != nil {
		return snap, nil, err
	}
	grades := gradesInScope(classes, sectionSet(sections))
	existing, err := tx.optionBlocksForYear(ctx, year.ID)
	if err != nil {
		return snap, nil, err
	}
	if useBlocks {
		var old []uuid.UUID
		for _, b := range existing {
			if grades[b.GradeID] {
				old = append(old, b.ID)
				snap.PreviousBlocks = append(snap.PreviousBlocks, b)
			}
		}
		if used, err := tx.optionBlocksInSubmittedTimetables(ctx, old); err != nil {
			return snap, nil, err
		} else if used {
			return snap, nil, fmt.Errorf("%w: incelenmekte olan veya yayınlanmış bir ders programı bu seviyelerin mevcut seçmeli ders bloklarını kullanıyor; önce onu revize edin veya seçmeli ders bloklarının işaretini kaldırın", ErrInvalidProposal)
		}
		if err := tx.deleteOptionBlocks(ctx, old); err != nil {
			return snap, nil, err
		}
		for _, r := range blockRows {
			if r.Cells["create"] != "true" {
				continue
			}
			grade, _ := parseID(r.Cells["grade_id"])
			periods, _ := strconv.Atoi(r.Cells["periods"])
			def := BlockDef{GradeID: grade, Name: r.Cells["name"], Periods: int32(periods), Subjects: parseIDs(r.Cells["subject_ids"]), Classes: parseIDs(r.Cells["class_ids"])}
			id, err := tx.createOptionBlock(ctx, year.ID, def)
			if err != nil {
				return snap, nil, fmt.Errorf("%s bloğu: %w", def.Name, err)
			}
			snap.CreatedBlocks = append(snap.CreatedBlocks, id)
		}
	}
	var results []timetablemodule.ClassGenerationResult
	for _, sec := range sections {
		res, err := tx.generateSection(ctx, year.ID, sec.ID, actor)
		if err != nil {
			return snap, nil, fmt.Errorf("%s şubesi: %w", sec.Name, err)
		}
		for _, c := range res.Classes {
			if c.TimetableID != nil {
				snap.Timetables = append(snap.Timetables, *c.TimetableID)
			}
		}
		results = append(results, res.Classes...)
	}
	return snap, results, nil
}

func sectionSet(sections []SectionInfo) map[uuid.UUID]bool {
	out := map[uuid.UUID]bool{}
	for _, s := range sections {
		out[s.ID] = true
	}
	return out
}

type timetableSnapshot struct {
	Year           uuid.UUID   `json:"year"`
	Timetables     []uuid.UUID `json:"timetables"`
	CreatedBlocks  []uuid.UUID `json:"created_blocks"`
	PreviousBlocks []BlockDef  `json:"previous_blocks"`
}

func (w Timetable) Propose(ctx context.Context, s *Store, in Inputs, trace *Trace) (Proposal, string, error) {
	year, sections, err := w.scope(ctx, s, in)
	if err != nil {
		return Proposal{}, "", err
	}
	var classes []SectionClass
	var status map[uuid.UUID]string
	if err := trace.Run(stepByKey(w, "check_setup"), func() (string, error) {
		var err error
		if classes, err = s.sectionClasses(ctx, year.ID); err != nil {
			return "", err
		}
		status, err = s.latestTimetableStatus(ctx, year.ID)
		return fmt.Sprintf("%s içinde %s", plural(len(sections), "şube", "şube"), plural(len(classes), "sınıf", "sınıf")), err
	}); err != nil {
		return Proposal{}, "", err
	}
	chosen := sectionSet(sections)
	var blockRows []Row
	var notes []string
	useBlocks := in["blocks"] == "true"
	if useBlocks {
		if err := trace.Run(stepByKey(w, "plan_blocks"), func() (string, error) {
			var err error
			blockRows, notes, err = w.planBlocks(ctx, s, year.ID, classes, gradesInScope(classes, chosen))
			return plural(len(blockRows), "seçmeli ders bloğu", "seçmeli ders bloğu"), err
		}); err != nil {
			return Proposal{}, "", err
		}
	}
	var results []timetablemodule.ClassGenerationResult
	if err := trace.Run(stepByKey(w, "preview"), func() (string, error) {
		return "geri alındı", s.dryRun(ctx, func(tx *Store) error {
			var err error
			_, results, err = w.build(ctx, tx, *year, sections, blockRows, useBlocks, actorFrom(ctx))
			return err
		})
	}); err != nil {
		return Proposal{}, "", err
	}

	sectionName := map[uuid.UUID]string{}
	for _, sec := range sections {
		sectionName[sec.ID] = sec.Name
	}
	classSection := map[uuid.UUID]string{}
	for _, c := range classes {
		classSection[c.ClassID] = sectionName[c.SectionID]
	}
	var classRows []Row
	complete, withGaps, skipped, replaced := 0, 0, 0, 0
	for _, r := range results {
		row := Row{ID: r.ClassID.String(), Group: classSection[r.ClassID], Cells: map[string]string{"class": r.ClassName, "now": statusLabel(status[r.ClassID]),
			"placed": fmt.Sprintf("%d / %d", r.Placed, r.Required)}}
		switch {
		case r.Skipped:
			skipped++
			row.Cells["placed"] = "-"
			row.Reason = "Dokunulmadı: ders programı " + statusLabel(status[r.ClassID]) + "."
		case len(r.Gaps) > 0:
			withGaps++
			row.Warning = gapSummary(r.Gaps)
		default:
			complete++
			row.Reason = "Tüm ders saatleri yerleştirildi."
		}
		if !r.Skipped && status[r.ClassID] == "draft" {
			replaced++
		}
		classRows = append(classRows, row)
	}
	p := Proposal{
		Summary: []Stat{
			{Label: "Sınıflar", Value: strconv.Itoa(len(results))},
			{Label: "Tamamlanan", Value: strconv.Itoa(complete)},
			{Label: "Boşluklu", Value: strconv.Itoa(withGaps)},
			{Label: "Dokunulmayan", Value: strconv.Itoa(skipped)},
			{Label: "Seçmeli ders blokları", Value: strconv.Itoa(len(blockRows))},
		},
		Warnings: notes,
		Sections: []Section{
			{Key: "classes", Title: "Ders programları", Description: "Her sınıfın ne aldığı, üreticinin deneme çalıştırmasından. Bir bloğun işaretini kaldırmak bunu değiştirir; yeni sonucu görmek için yeniden çalıştırın.", Columns: []Column{
				{Key: "class", Label: "Sınıf", Type: "text"}, {Key: "now", Label: "Şu an", Type: "text"}, {Key: "placed", Label: "Yerleşen ders saati", Type: "text"},
			}, Rows: classRows},
			{Key: "blocks", Title: "Seçmeli ders blokları", Description: "Her blok, derslerini tüm sınıflarında aynı ders saatlerinde çalıştırır. Bir bloğun işaretini kaldırın; dersleri normal dersler olarak programlanır.", Columns: []Column{
				{Key: "grade", Label: "Sınıf seviyesi", Type: "text"}, {Key: "name", Label: "Blok", Type: "text"}, {Key: "subjects", Label: "Dersler", Type: "text"},
				{Key: "classes", Label: "Sınıflar", Type: "text"}, {Key: "periods", Label: "Haftalık ders saati", Type: "number"}, {Key: "create", Label: "Kullan", Type: "boolean", Editable: true},
			}, Rows: blockRows},
		},
	}
	if replaced > 0 {
		p.Warnings = append(p.Warnings, fmt.Sprintf("%s zaten taslağa sahip; uygulamak onu değiştirir ve geri alma eski taslağı geri getiremez.", plural(replaced, "sınıf", "sınıf")))
	}
	if withGaps > 0 {
		p.Warnings = append(p.Warnings, fmt.Sprintf("%s boşluklu. Ayarları düzeltip yeniden çalıştırın veya boşlukları ders programı düzenleyicisinde elle doldurun.", plural(withGaps, "sınıf", "sınıf")))
	}
	return p, "timetable:" + year.ID.String(), nil
}

func statusLabel(s string) string {
	switch s {
	case "":
		return "ders programı yok"
	case "under_review":
		return "incelemede"
	case "draft":
		return "taslak"
	case "published":
		return "yayınlandı"
	case "approved":
		return "onaylandı"
	}
	return s
}

func gapSummary(gaps []timetablemodule.GenerationGap) string {
	var parts []string
	for i, g := range gaps {
		if i == 3 {
			parts = append(parts, fmt.Sprintf("ve %d tane daha", len(gaps)-3))
			break
		}
		label := g.SubjectName
		if label == "" {
			label = "Ders programı"
		}
		parts = append(parts, label+": "+g.Reason)
	}
	return strings.Join(parts, "; ") + "."
}

func (w Timetable) Apply(ctx context.Context, tx *Store, in Inputs, p Proposal, actor uuid.UUID, trace *Trace) (json.RawMessage, string, error) {
	year, sections, err := w.scope(ctx, tx, in)
	if err != nil {
		return nil, "", err
	}
	if year == nil {
		return nil, "", fmt.Errorf("%w: yıl artık mevcut değil", ErrInvalidProposal)
	}
	var blockRows []Row
	if section := p.Section("blocks"); section != nil {
		blockRows = section.Rows
	}
	useBlocks := in["blocks"] == "true"
	var snap timetableSnapshot
	var results []timetablemodule.ClassGenerationResult
	_ = trace.Run(stepByKey(w, "save_blocks"), func() (string, error) {
		used := 0
		for _, r := range blockRows {
			if r.Cells["create"] == "true" {
				used++
			}
		}
		if !useBlocks {
			return "seçmeli ders blokları kullanılmadı", nil
		}
		return plural(used, "seçmeli ders bloğu", "seçmeli ders bloğu") + " kaydedilecek", nil
	})
	if err := trace.Run(stepByKey(w, "generate"), func() (string, error) {
		var err error
		snap, results, err = w.build(ctx, tx, *year, sections, blockRows, useBlocks, actor)
		gaps := 0
		for _, r := range results {
			gaps += len(r.Gaps)
		}
		return fmt.Sprintf("%s üretildi, %s", plural(len(snap.Timetables), "taslak", "taslak"), plural(gaps, "boşluk", "boşluk")), err
	}); err != nil {
		return nil, "", err
	}
	data, _ := json.Marshal(snap)
	return data, fmt.Sprintf("%s ve %s üretildi", plural(len(snap.Timetables), "taslak ders programı", "taslak ders programı"), plural(len(snap.CreatedBlocks), "seçmeli ders bloğu", "seçmeli ders bloğu")), nil
}

func (Timetable) Revert(ctx context.Context, tx *Store, snapshot json.RawMessage) error {
	var snap timetableSnapshot
	if err := json.Unmarshal(snapshot, &snap); err != nil {
		return err
	}
	moved, err := tx.timetablesPastDraft(ctx, snap.Timetables)
	if err != nil {
		return err
	}
	if moved {
		return errTimetablesInUse
	}
	if err := tx.deleteDraftTimetables(ctx, snap.Timetables); err != nil {
		return err
	}
	if err := tx.deleteOptionBlocks(ctx, snap.CreatedBlocks); err != nil {
		return err
	}
	for _, b := range snap.PreviousBlocks {
		if _, err := tx.createOptionBlock(ctx, snap.Year, b); err != nil {
			return err
		}
	}
	return nil
}
