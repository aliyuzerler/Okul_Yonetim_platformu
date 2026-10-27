package workflows

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Tools lists every backend operation the workflows use. Each StepInfo names one of these,
// and the catalogue returns them, so the frontend never describes an agent by hand.
var Tools = map[string]ToolInfo{}

func tool(name, description string, mutates bool) string {
	Tools[name] = ToolInfo{Name: name, Description: description, Mutates: mutates}
	return name
}

var (
	ToolReadYears          = tool("read_academic_years", "Eğitim-öğretim yıllarını, tarihlerini ve hangisinin güncel olduğunu okur.", false)
	ToolReadClasses        = tool("read_classes", "Bir yılın sınıflarını sınıf seviyesi, alan, öğretim dili, sınıf öğretmeni, kontenjan ve öğrenci sayısıyla okur.", false)
	ToolReadTerms          = tool("read_terms", "Bir yılın dönemlerini sırayla okur.", false)
	ToolReadStudents       = tool("read_students", "Aktif öğrencileri sınıf, sınıf seviyesi, cinsiyet, kol ve öğretim diliyle okur.", false)
	ToolReadChoices        = tool("read_subject_choices", "Her öğrencinin hedef yıl ders kayıtlarını ve seçtiği seviyenin alanını okur.", false)
	ToolReadPolicies       = tool("read_promotion_policies", "Her seviye geçişinin sınıf geçme kuralını okur (şubeyi koru, yeniden karıştır, ders seçimine göre grupla, alana göre grupla, okuldan ayrılır).", false)
	ToolPlaceStudents      = tool("place_students", "Deterministik yerleştirme motoru: her öğrenciye seviye geçişi kuralına, sınıf kontenjanına ve öğretim diline göre bir sınıf verir; her biri için neden bildirir.", false)
	ToolPlanNewClasses     = tool("plan_new_classes", "Öğrenciler mevcut sınıflara sığmadığında bir seviyenin ihtiyaç duyduğu ek şubeleri hesaplar.", false)
	ToolCreateYear         = tool("create_academic_year", "Henüz güncel olmayan bir eğitim-öğretim yılı oluşturur.", true)
	ToolCopyTerms          = tool("copy_terms", "Dönem adlarını yeni yıla kopyalar, tarihleri tam yıl kadar ileri alır.", true)
	ToolCopyClasses        = tool("copy_classes", "Yeni yılın sınıflarını aynı sınıf seviyesi, alan, öğretim dili, kontenjan ve sınıf öğretmeniyle oluşturur.", true)
	ToolCopyTimetableSetup = tool("copy_timetable_setup", "Seviye şubelerini, ders saati çizelgelerini, ders saatlerini, ders programı ayarlarını ve şube rehber öğretmenlerini kopyalar.", true)
	ToolMarkLeavers        = tool("mark_leavers", "Öğrencileri bir ayrılış tarihiyle ayrıldı olarak işaretler; PDPA saklama süresini başlatır.", true)
	ToolCreateClasses      = tool("create_classes", "Yerleştirmenin ihtiyaç duyduğu ek şubeleri, her biri bir sınıf öğretmeniyle oluşturur.", true)
	ToolAssignClasses      = tool("assign_classes", "Her öğrencinin hedef yıl sınıfını yazar, o yılın önceki atamasının yerine geçer.", true)
	ToolSetCurrentYear     = tool("set_current_year", "Hedef yılı ve ilk dönemini güncel yapar; aynı anda yalnızca bir yıl güncel kalır (ADR 0003).", true)
	ToolNotifySchool       = tool("notify_school", "Yeni yılın yayında olduğunu herkese tek bir uygulama içi duyuruyla bildirir.", true)
	ToolSavePolicies       = tool("save_promotion_rules", "Her seviye geçişi için seçilen kuralı hatırlar, böylece gelecek yıl bu kuraldan başlar.", true)
	ToolCheckYearReadiness = tool("check_year_readiness", "Bir yıl için sınıfları, yerleştirilen öğrencileri, yayınlanmış ders programlarını ve dönemleri sayar.", false)
)

// ---- Input helpers shared by the definitions ----

func yearOptions(years []Year) []Option {
	out := make([]Option, len(years))
	for i, y := range years {
		label := y.Label
		if y.Current {
			label += " (güncel)"
		}
		out[i] = Option{Value: y.ID.String(), Label: label}
	}
	return out
}

func currentYear(years []Year) *Year {
	for i := range years {
		if years[i].Current {
			return &years[i]
		}
	}
	return nil
}

func parseID(v string) (uuid.UUID, bool) {
	id, err := uuid.Parse(v)
	return id, err == nil
}

func parseDate(v string) (time.Time, bool) {
	t, err := time.Parse("2006-01-02", v)
	return t, err == nil
}

func parseIDs(v string) []uuid.UUID {
	var out []uuid.UUID
	for _, part := range strings.Split(v, ",") {
		if id, ok := parseID(strings.TrimSpace(part)); ok {
			out = append(out, id)
		}
	}
	return out
}

// nextLabel turns "2026" into "2027"; anything else is left for the person to type.
func nextLabel(label string) string {
	if n, err := strconv.Atoi(strings.TrimSpace(label)); err == nil {
		return strconv.Itoa(n + 1)
	}
	return ""
}

func fmtDate(t time.Time) string { return t.Format("2006-01-02") }

func plural(n int, one, many string) string {
	if n == 1 {
		return fmt.Sprintf("%d %s", n, one)
	}
	return fmt.Sprintf("%d %s", n, many)
}

// afterApplier is implemented by workflows that do something outside the transaction once it commits.
type afterApplier interface {
	AfterApply(ctx context.Context, s *Store, in Inputs, actor uuid.UUID) error
}
