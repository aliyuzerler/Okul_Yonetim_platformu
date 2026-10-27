package workflows

import (
	"fmt"
	"sort"

	"github.com/google/uuid"
)

// AllocNeed is one subject a class must be taught next year.
type AllocNeed struct {
	ClassID, SubjectID, GradeID uuid.UUID
	ClassName, SubjectName      string
	GradeOrder                  int32
	Periods                     int
	Existing                    uuid.UUID // already assigned in the target year; kept as is
	Continuity                  uuid.UUID // taught this subject to the class's students last year
	PreviousClass               string
}

// AllocResult is the engine's decision for one need.
type AllocResult struct {
	TeacherID       uuid.UUID
	Reason, Warning string
}

// Allocate gives every class subject a qualified teacher, deterministically: assignments already
// made are kept, then the scarcest subjects are filled first, preferring the teacher who taught the
// class last year and otherwise the qualified teacher with the lightest week. No teacher is taken
// past maxPeriods; a need that cannot be filled is left empty with the reason.
func Allocate(needs []AllocNeed, teachers []TeacherInfo, maxPeriods int) (map[int]AllocResult, map[uuid.UUID]int) {
	load := map[uuid.UUID]int{}
	byID := map[uuid.UUID]TeacherInfo{}
	qualified := map[uuid.UUID][]TeacherInfo{}
	for _, t := range teachers {
		byID[t.ID] = t
		for sid := range t.Subjects {
			qualified[sid] = append(qualified[sid], t)
		}
	}
	for sid := range qualified {
		sort.Slice(qualified[sid], func(i, j int) bool { return qualified[sid][i].ID.String() < qualified[sid][j].ID.String() })
	}
	gradeTeam := map[[2]uuid.UUID]map[uuid.UUID]bool{} // grade+subject -> teachers already teaching it
	take := func(n AllocNeed, t uuid.UUID) {
		load[t] += n.Periods
		key := [2]uuid.UUID{n.GradeID, n.SubjectID}
		if gradeTeam[key] == nil {
			gradeTeam[key] = map[uuid.UUID]bool{}
		}
		gradeTeam[key][t] = true
	}

	out := map[int]AllocResult{}
	order := make([]int, len(needs))
	for i := range order {
		order[i] = i
	}
	sort.SliceStable(order, func(a, b int) bool {
		na, nb := needs[order[a]], needs[order[b]]
		if ea, eb := na.Existing != uuid.Nil, nb.Existing != uuid.Nil; ea != eb {
			return ea
		}
		if qa, qb := len(qualified[na.SubjectID]), len(qualified[nb.SubjectID]); qa != qb {
			return qa < qb
		}
		if na.Periods != nb.Periods {
			return na.Periods > nb.Periods
		}
		if na.GradeOrder != nb.GradeOrder {
			return na.GradeOrder < nb.GradeOrder
		}
		if na.ClassName != nb.ClassName {
			return naturalLess(na.ClassName, nb.ClassName)
		}
		return na.SubjectName < nb.SubjectName
	})

	for _, i := range order {
		n := needs[i]
		if n.Existing != uuid.Nil {
			take(n, n.Existing)
			out[i] = AllocResult{TeacherID: n.Existing, Reason: "Gelecek yıl için zaten görevlendirilmiş."}
			continue
		}
		fits := func(t uuid.UUID) bool { return load[t]+n.Periods <= maxPeriods }
		if c, ok := byID[n.Continuity]; ok && c.Subjects[n.SubjectID] && fits(c.ID) {
			take(n, c.ID)
			out[i] = AllocResult{TeacherID: c.ID, Reason: fmt.Sprintf("Geçen yıl %s sınıfına bu dersi verdi.", n.PreviousClass)}
			continue
		}
		candidates := qualified[n.SubjectID]
		if len(candidates) == 0 {
			out[i] = AllocResult{Warning: n.SubjectName + " için yetkin öğretmen yok. Öğretmen branşları altından ekleyin."}
			continue
		}
		var best *TeacherInfo
		team := gradeTeam[[2]uuid.UUID{n.GradeID, n.SubjectID}]
		for k := range candidates {
			t := &candidates[k]
			if !fits(t.ID) {
				continue
			}
			if best == nil || load[t.ID] < load[best.ID] || (load[t.ID] == load[best.ID] && team[t.ID] && !team[best.ID]) {
				best = t
			}
		}
		if best == nil {
			out[i] = AllocResult{Warning: fmt.Sprintf("%s için yetkin tüm öğretmenlerin haftalık yükü zaten en az %d ders saati. Sınırı yükseltin veya birini elle seçin.", n.SubjectName, maxPeriods-n.Periods+1)}
			continue
		}
		take(n, best.ID)
		reason := fmt.Sprintf("Branşı yetkin ve haftalık programı en hafif olan (%d ders saati).", load[best.ID])
		if n.Continuity != uuid.Nil && n.Continuity != best.ID {
			reason = "Geçen yılın öğretmeni uygun değil; " + reason
		}
		out[i] = AllocResult{TeacherID: best.ID, Reason: reason}
	}
	return out, load
}
