package workflows

import (
	"fmt"
	"strings"

	"github.com/openschool-org/openschool/internal/names"
)

// guardianSeen is a guardian's first row in the file (line > 0), or someone already on record (line 0).
type guardianSeen struct {
	line                    int
	nic, name, email, phone string
	// account marks an email owned by an existing login rather than a guardian record.
	account bool
}

// guardianChecker catches guardian rows that disagree. A NIC is one person, so a NIC with a second name or
// email is blocked: linking a child to the wrong parent would show that child's records to a stranger.
type guardianChecker struct {
	byNIC   map[string]guardianSeen
	byPhone map[string][]guardianSeen
	byEmail map[string]guardianSeen
}

func newGuardianChecker() *guardianChecker {
	return &guardianChecker{byNIC: map[string]guardianSeen{}, byPhone: map[string][]guardianSeen{}, byEmail: map[string]guardianSeen{}}
}

// seed adds guardians and logins already on record, so rows are compared with them as well as with each other.
func (g *guardianChecker) seed(people, emailOwners []guardianSeen) {
	for _, p := range people {
		if p.phone != "" {
			g.byPhone[p.phone] = append(g.byPhone[p.phone], p)
		}
	}
	for _, o := range emailOwners {
		if _, seen := g.byEmail[o.email]; !seen {
			g.byEmail[o.email] = o
		}
	}
}

func (other guardianSeen) where() string {
	if other.line == 0 {
		return "kayıtlarda"
	}
	return fmt.Sprintf("%d. satırında", other.line)
}

// check returns a blocking problem (or "") and non-blocking notes for one row's guardian.
// onRecord is the guardian already saved under this NIC, if any.
func (g *guardianChecker) check(row guardianSeen, onRecord *guardianSeen) (string, []string) {
	var notes []string
	email := strings.ToLower(row.email)

	if onRecord != nil {
		if !names.SamePerson(onRecord.name, row.name) {
			return fmt.Sprintf("%s T.C. Kimlik No'lu veli kayıtlarda %s, %s değil. T.C. Kimlik No'yu veya adı kontrol edin.", row.nic, onRecord.name, row.name), nil
		}
		if onRecord.email != "" && email != "" && !strings.EqualFold(onRecord.email, email) {
			return fmt.Sprintf("%s T.C. Kimlik No'lu velinin kayıtlardaki e-postası %s, %s değil. T.C. Kimlik No'yu veya e-postayı kontrol edin.", row.nic, onRecord.email, row.email), nil
		}
	}

	if first, seen := g.byNIC[row.nic]; seen {
		if !names.SamePerson(first.name, row.name) {
			return fmt.Sprintf("%s T.C. Kimlik No %d. satırında %s, burada %s. Bir T.C. Kimlik No tek kişiye ait olmalı: adı veya T.C. Kimlik No'yu düzeltin.", row.nic, first.line, first.name, row.name), nil
		}
		if first.email != "" && email != "" && first.email != email {
			return fmt.Sprintf("%s T.C. Kimlik No'nun %d. satırındaki e-postası %s, burada %s. Her veli için tek e-posta kullanın.", row.nic, first.line, first.email, row.email), nil
		}
		if first.phone != "" && row.phone != "" && first.phone != row.phone {
			notes = append(notes, fmt.Sprintf("Veli telefonu %d. satırdan farklı; ilki (%s) korunacak.", first.line, first.phone))
		}
		return "", notes
	}
	row.email = email
	g.byNIC[row.nic] = row

	// A new NIC: look for the same person entered under another NIC, and for a shared email.
	if row.phone != "" {
		for _, other := range g.byPhone[row.phone] {
			if other.nic != row.nic && names.SamePerson(other.name, row.name) {
				nic := other.nic
				if nic == "" {
					nic = "T.C. Kimlik No yok"
				}
				notes = append(notes, fmt.Sprintf("%s (%s telefonu) zaten %s var: %s. Aynı kişi ise o T.C. Kimlik No'yu kullanın; böylece çocuklar tek veliye bağlanır.", row.name, row.phone, other.where(), nic))
				break
			}
		}
		g.byPhone[row.phone] = append(g.byPhone[row.phone], row)
	}
	// A guardian's own email on record is not a clash.
	ownEmail := onRecord != nil && email != "" && strings.EqualFold(onRecord.email, email)
	if email != "" && !ownEmail {
		if other, seen := g.byEmail[email]; seen && (other.account || other.nic != row.nic) {
			if other.account {
				notes = append(notes, fmt.Sprintf("%s e-postası zaten bir OpenSchool hesabına ait (%s). Bu velinin etkinleştirme için farklı bir e-postası gerekecek.", row.email, other.name))
			} else {
				notes = append(notes, fmt.Sprintf("%s e-postası zaten %s (%s) tarafından kullanılıyor. Her velinin hesabını etkinleştirmek için kendi e-postasına ihtiyacı var.", row.email, other.name, other.where()))
			}
		} else if !seen {
			g.byEmail[email] = row
		}
	}
	return "", notes
}
