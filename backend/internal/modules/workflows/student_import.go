package workflows

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/names"
)

// StudentImport loads existing students into this year's classes in one go, for a school starting on OpenSchool.
// Unlike Intake it needs no coming year and no Promotion: each row names its class.
type StudentImport struct{}

func (StudentImport) Key() string   { return "student_import" }
func (StudentImport) Title() string { return "Toplu öğrenci aktarımı" }
func (StudentImport) Group() string { return GroupSetup }
func (StudentImport) Description() string {
	return "Birçok öğrenciyi ve velilerini tek seferde ekler ve her birini güncel yılın bir sınıfına yerleştirir. Önizlemeyi inceleyip uygulamadan hiçbir şey kaydedilmez; aktarım geri alınabilir."
}

var (
	ToolReadImportCSV  = tool("read_import_csv", "Öğrenci CSV'sini okur ve her satırı denetler: zorunlu alanlar, sınıf, telefon numaraları, cinsiyet, okul numarası ve veli T.C. Kimlik No ile mükerrer kontrolü.", false)
	ToolImportStudents = tool("import_students", "Öğrencileri ve velileri oluşturur, kardeşleri aynı veliye bağlar ve her öğrenciyi sınıfına yerleştirir.", true)
	importColumns      = []string{"class", "index_number", "full_name", "name_with_initials", "calling_name", "gender", "address", "phone", "guardian_name", "guardian_relationship", "guardian_phone", "guardian_nic", "guardian_email"}
	importTemplate     = strings.Join(importColumns, ",") + "\n6-A,2026/0001,Hettiwatta Arachchige Nimali Perera,,Nimali,female,\"12 Temple Road, Kandy\",0771234567,H.A. Sunil Perera,father,0712345678,197512345678,\n6-A,2026/0002,Hettiwatta Arachchige Kasun Perera,H.A.K. Perera,,male,\"12 Temple Road, Kandy\",,H.A. Sunil Perera,father,0712345678,197512345678,\n"
)

func (StudentImport) Steps() []StepInfo {
	return []StepInfo{
		{Key: "read_csv", Title: "CSV'yi oku ve denetle", Tool: ToolReadImportCSV, Phase: "propose"},
		{Key: "import_students", Title: "Öğrencileri oluştur ve sınıflara yerleştir", Tool: ToolImportStudents, Phase: "apply"},
	}
}

func (StudentImport) Inputs(context.Context, *Store) ([]InputField, error) {
	return []InputField{{Key: "csv", Label: "Öğrenci CSV'si", Type: "csv", Required: true, Template: importTemplate,
		Help: "Öğrenci başına bir satır. Sınıf sütunu sınıf adını kullanır, örneğin 6-A. name_with_initials (H.A.N. Perera gibi) boş bırakılırsa tam addan doldurulur; calling_name isteğe bağlıdır. Kardeşler aynı veli T.C. Kimlik No'yu paylaşır, böylece tek veliye bağlanır. Excel'de yazmaya başlamadan önce telefon ve T.C. Kimlik No sütunlarını Metin olarak biçimlendirin, yoksa Excel uzun sayıları kısaltır."}}, nil
}

func (StudentImport) Check(ctx context.Context, s *Store, in Inputs) ([]Check, error) {
	years, err := s.years(ctx)
	if err != nil {
		return nil, err
	}
	year := currentYear(years)
	var classes []YearClass
	if year != nil {
		if classes, err = s.yearClasses(ctx, year.ID); err != nil {
			return nil, err
		}
	}
	rows, csvErr := parseStudentCSV(in["csv"], importColumns)
	detail := plural(len(rows), "satır", "satır")
	if csvErr != nil {
		detail = csvErr.Error()
	}
	yearDetail := ""
	if year != nil {
		yearDetail = year.Label
	}
	return []Check{
		{Key: "year", Title: "Güncel bir eğitim-öğretim yılı seçilmiş", OK: year != nil, Blocking: true, FixPath: "/academic-years", Detail: yearDetail},
		{Key: "classes", Title: "Güncel yılın sınıfları var", OK: len(classes) > 0, Blocking: true, FixPath: "/classes", Detail: plural(len(classes), "sınıf", "sınıf")},
		{Key: "csv", Title: "CSV'de başlık satırı ve en az bir öğrenci var", OK: csvErr == nil && len(rows) > 0, Blocking: true, Detail: detail},
	}, nil
}

// classKey ignores case, spaces, dashes and a leading "grade", so "6-A", "6A" and "Grade 6 A" all match.
func classKey(v string) string {
	v = strings.ToLower(v)
	v = strings.TrimPrefix(strings.TrimSpace(v), "grade")
	return strings.NewReplacer(" ", "", "-", "", "_", "", "/", "").Replace(v)
}

func classLabel(c YearClass) string { return c.GradeName + " · " + c.Name }

func (w StudentImport) Propose(ctx context.Context, s *Store, in Inputs, trace *Trace) (Proposal, string, error) {
	years, err := s.years(ctx)
	if err != nil {
		return Proposal{}, "", err
	}
	year := currentYear(years)
	if year == nil {
		return Proposal{}, "", fmt.Errorf("%w: önce güncel bir eğitim-öğretim yılı seçin", ErrInvalidProposal)
	}
	var rows []Row
	var classOptions []Option
	var warnings []string
	var toImport, withErrors, noClass, reused, siblings, notedRows int
	if err := trace.Run(stepByKey(w, "read_csv"), func() (string, error) {
		records, err := parseStudentCSV(in["csv"], importColumns)
		if err != nil {
			return "", err
		}
		classes, err := s.yearClasses(ctx, year.ID)
		if err != nil {
			return "", err
		}
		byKey := map[string][]YearClass{}
		for _, c := range classes {
			classOptions = append(classOptions, Option{Value: c.ID.String(), Label: classLabel(c)})
			byKey[classKey(c.Name)] = append(byKey[classKey(c.Name)], c)
			if k := classKey(c.GradeName + c.Name); k != classKey(c.Name) {
				byKey[k] = append(byKey[k], c)
			}
		}
		schoolType, err := s.schoolType(ctx)
		if err != nil {
			return "", err
		}
		var numbers, nics []string
		for _, r := range records {
			numbers = append(numbers, r.fields["index_number"])
			nics = append(nics, strings.ToUpper(r.fields["guardian_nic"]))
		}
		taken, err := s.existingIndexNumbers(ctx, numbers)
		if err != nil {
			return "", err
		}
		known, err := s.guardiansByNIC(ctx, nics)
		if err != nil {
			return "", err
		}
		var phones, emails []string
		for _, r := range records {
			if v := r.fields["guardian_phone"]; v != "" {
				phones = append(phones, v)
			}
			if v := strings.ToLower(r.fields["guardian_email"]); v != "" {
				emails = append(emails, v)
			}
		}
		onRecord, emailOwners, err := s.existingContacts(ctx, phones, emails)
		if err != nil {
			return "", err
		}
		seenIndex := map[string]int{}
		seenNIC := map[string]string{}
		placed := map[uuid.UUID]int{}
		guardians := newGuardianChecker()
		guardians.seed(onRecord, emailOwners)
		for _, r := range records {
			f := r.fields
			nic := strings.ToUpper(f["guardian_nic"])
			var withInitials, calling string
			f["full_name"], withInitials, calling = names.Normalize(f["full_name"], f["name_with_initials"], f["calling_name"])
			problem := rowProblem(f, schoolType)
			if problem == "" && taken[f["index_number"]] {
				problem = f["index_number"] + " okul numarası zaten kayıtlı bir öğrenciye ait."
			}
			if line, dup := seenIndex[f["index_number"]]; problem == "" && dup {
				problem = fmt.Sprintf("%d. satırla aynı okul numarası.", line)
			}
			seenIndex[f["index_number"]] = r.line

			var guardianNotes []string
			if problem == "" && nic != "" {
				var onRecord *guardianSeen
				if g, ok := known[nic]; ok {
					onRecord = &guardianSeen{name: g.FullName, email: g.Email}
				}
				problem, guardianNotes = guardians.check(guardianSeen{line: r.line, nic: nic, name: f["guardian_name"], email: f["guardian_email"], phone: f["guardian_phone"]}, onRecord)
				if len(guardianNotes) > 0 {
					notedRows++
				}
			}

			matches := byKey[classKey(f["class"])]
			classID, reason := "", "Yeni öğrenci."
			switch {
			case f["class"] == "":
				reason = "Sınıf belirtilmemiş: bir sınıf seçin, sonra Aktar'ı işaretleyin."
			case len(matches) == 0:
				reason = fmt.Sprintf("%q sınıfı %s için oluşturulmamış: bir sınıf seçin, sonra Aktar'ı işaretleyin.", f["class"], year.Label)
			case len(matches) > 1:
				reason = fmt.Sprintf("%q birden fazla sınıf seviyesiyle eşleşiyor: doğru olanı seçin, sonra Aktar'ı işaretleyin.", f["class"])
			default:
				classID = matches[0].ID.String()
			}
			switch {
			case !hasGuardian(f):
				reason += " Veli belirtilmemiş; öğrencinin sayfasından ekleyin."
			case known[nic].FullName != "":
				reason += " " + known[nic].FullName + " velisi zaten kayıtlı, bu öğrenci ona bağlanacak, yeniden eklenmeyecek."
				if known[nic].HasLogin {
					reason += " Oturumu var, bu çocuk onların veli portalında görünecek."
				}
				if problem == "" {
					reused++
				}
			case seenNIC[nic] != "":
				reason += " " + seenNIC[nic] + " öğrencisinin kardeşi: aynı veliye bağlanacak."
				if problem == "" {
					siblings++
				}
			}
			if nic != "" && seenNIC[nic] == "" {
				seenNIC[nic] = f["full_name"]
			}
			if len(guardianNotes) > 0 {
				reason += " " + strings.Join(guardianNotes, " ")
			}

			importIt := problem == "" && classID != ""
			switch {
			case problem != "":
				withErrors++
			case classID == "":
				noClass++
			default:
				toImport++
				placed[matches[0].ID]++
			}
			rows = append(rows, Row{ID: "line:" + strconv.Itoa(r.line), Reason: strings.TrimSpace(reason), Warning: problem,
				Cells: map[string]string{
					"line": strconv.Itoa(r.line), "class": classID, "index": f["index_number"], "name": f["full_name"], "gender": strings.ToLower(f["gender"]),
					"name_with_initials": withInitials, "calling_name": calling,
					"guardian": f["guardian_name"], "guardian_nic": nic, "import": strconv.FormatBool(importIt), "error": problem,
					"address": f["address"], "phone": f["phone"], "relationship": strings.ToLower(f["guardian_relationship"]),
					"guardian_phone": f["guardian_phone"], "guardian_email": f["guardian_email"],
				}})
		}
		for _, c := range classes {
			if n := placed[c.ID]; n > 0 && c.Capacity > 0 && int(c.Students)+n > int(c.Capacity) {
				warnings = append(warnings, fmt.Sprintf("%s sınıfında %d öğrenci olacak; kontenjan %d.", classLabel(c), int(c.Students)+n, c.Capacity))
			}
		}
		return fmt.Sprintf("%d satır, %d hazır, %d sınıf bekliyor, %d sorunlu", len(records), toImport, noClass, withErrors), nil
	}); err != nil {
		return Proposal{}, "", err
	}
	p := Proposal{
		Summary: []Stat{
			{Label: "Okunan satır", Value: strconv.Itoa(len(rows))},
			{Label: "Aktarıma hazır", Value: strconv.Itoa(toImport)},
			{Label: "Sınıf bekliyor", Value: strconv.Itoa(noClass)},
			{Label: "Sorunlu", Value: strconv.Itoa(withErrors)},
			{Label: "Zaten kayıtlı veliler", Value: strconv.Itoa(reused)},
			{Label: "Dosyadaki kardeşler", Value: strconv.Itoa(siblings)},
		},
		Sections: []Section{{Key: "students", Title: "Öğrenciler", Description: "İşaretli satırlar gösterilen sınıfa aktarılır. Sorunlu satırlar işaretlenemez: CSV'yi düzeltip yeniden çalıştırın.", Columns: []Column{
			{Key: "line", Label: "Satır", Type: "number"}, {Key: "class", Label: "Sınıf", Type: "select", Editable: true, Options: classOptions},
			{Key: "index", Label: "Okul no.", Type: "text"}, {Key: "name_with_initials", Label: "Baş harfli ad", Type: "text"}, {Key: "name", Label: "Tam ad", Type: "text"}, {Key: "gender", Label: "Cinsiyet", Type: "text"},
			{Key: "guardian", Label: "Veli", Type: "text"}, {Key: "guardian_nic", Label: "Veli T.C. Kimlik No", Type: "text"},
			{Key: "import", Label: "Aktar", Type: "boolean", Editable: true},
		}, Rows: rows}},
		Warnings: warnings,
	}
	if withErrors > 0 {
		p.Warnings = append(p.Warnings, fmt.Sprintf("%s sorunlu ve atlanacak. CSV'de düzeltip aktarımı yeniden çalıştırın.", plural(withErrors, "satır", "satır")))
	}
	if notedRows > 0 {
		p.Warnings = append(p.Warnings, fmt.Sprintf("%s satırın veli bilgileri incelenmeli: örneğin bir velinin iki T.C. Kimlik No ile geçmesi veya paylaşılan e-posta. Her satırın notuna bakın.", plural(notedRows, "satır", "satır")))
	}
	if noClass > 0 {
		p.Warnings = append(p.Warnings, fmt.Sprintf("%s sınıf bekliyor. Sınıf sütunundan birini seçip Aktar'ı işaretleyin veya CSV'yi düzeltin.", plural(noClass, "satır", "satır")))
	}
	return p, "student_import:" + year.ID.String(), nil
}

type importSnapshot struct {
	Year      uuid.UUID   `json:"year"`
	Students  []uuid.UUID `json:"students"`
	Guardians []uuid.UUID `json:"guardians"`
}

func (w StudentImport) Apply(ctx context.Context, tx *Store, _ Inputs, p Proposal, _ uuid.UUID, trace *Trace) (json.RawMessage, string, error) {
	years, err := tx.years(ctx)
	if err != nil {
		return nil, "", err
	}
	year := currentYear(years)
	if year == nil {
		return nil, "", fmt.Errorf("%w: güncel bir eğitim-öğretim yılı yok", ErrInvalidProposal)
	}
	snap := importSnapshot{Year: year.ID}
	if err := trace.Run(stepByKey(w, "import_students"), func() (string, error) {
		classes, err := tx.yearClasses(ctx, year.ID)
		if err != nil {
			return "", err
		}
		valid := map[uuid.UUID]bool{}
		for _, c := range classes {
			valid[c.ID] = true
		}
		var ticked []Row
		var numbers, nics []string
		for _, r := range p.Section("students").Rows {
			if r.Cells["import"] != "true" {
				continue
			}
			if r.Cells["error"] != "" {
				return "", fmt.Errorf("%w: %s. satır: %s", ErrInvalidProposal, r.Cells["line"], r.Cells["error"])
			}
			// An edited class must still be one of this year's classes.
			if id, ok := parseID(r.Cells["class"]); !ok || !valid[id] {
				return "", fmt.Errorf("%w: %s. satır: güncel yılın sınıflarından birini seçin", ErrInvalidProposal, r.Cells["line"])
			}
			ticked = append(ticked, r)
			numbers = append(numbers, r.Cells["index"])
			nics = append(nics, r.Cells["guardian_nic"])
		}
		taken, err := tx.existingIndexNumbers(ctx, numbers)
		if err != nil {
			return "", err
		}
		known, err := tx.guardiansByNIC(ctx, nics)
		if err != nil {
			return "", err
		}
		guardianByNIC := map[string]uuid.UUID{}
		for nic, g := range known {
			guardianByNIC[nic] = g.ID
		}
		ids, guardians, err := createStudentRows(ctx, tx, ticked, taken, guardianByNIC)
		if err != nil {
			return "", err
		}
		snap.Students, snap.Guardians = ids, guardians
		assignments := make([]Assignment, len(ids))
		for i, r := range ticked {
			classID, _ := parseID(r.Cells["class"])
			assignments[i] = Assignment{StudentID: ids[i], ClassID: classID}
		}
		if err := tx.reassign(ctx, year.ID, nil, assignments); err != nil {
			return "", err
		}
		return fmt.Sprintf("%d öğrenci, %d yeni veli", len(ids), len(guardians)), nil
	}); err != nil {
		return nil, "", err
	}
	data, _ := json.Marshal(snap)
	return data, fmt.Sprintf("%s, %s ile birlikte sınıflarına aktarıldı. Sıradaki adım: Ayarlar > Hesap etkinleştirme'den etkinleştirme kodlarını oluşturun.",
		plural(len(snap.Students), "öğrenci", "öğrenci"), plural(len(snap.Guardians), "yeni veli", "yeni veli")), nil
}

// Revert removes this import's own class places first, so only later work (accounts, subjects, attendance, marks) blocks an undo.
func (StudentImport) Revert(ctx context.Context, tx *Store, snapshot json.RawMessage) error {
	var snap importSnapshot
	if err := json.Unmarshal(snapshot, &snap); err != nil {
		return err
	}
	if err := tx.reassign(ctx, snap.Year, snap.Students, nil); err != nil {
		return err
	}
	used, err := tx.studentsInUse(ctx, snap.Students)
	if err != nil {
		return err
	}
	if used {
		return errStudentsInUse
	}
	return tx.deleteImported(ctx, snap.Students, snap.Guardians)
}
