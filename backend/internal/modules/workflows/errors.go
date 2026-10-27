package workflows

import "errors"

var (
	errClassesInUse    = errors.New("bu sınıflar için yoklama veya notlar zaten girilmiş, bu yüzden yerleştirme artık geri alınamaz")
	errStudentsInUse   = errors.New("aktarılan bazı öğrencilerin zaten bir hesabı, sınıfı, dersi veya kayıtları var, bu yüzden aktarım artık geri alınamaz")
	errTimetablesInUse = errors.New("bu sınıfların ders programı incelemeye gönderilmiş veya yayınlanmış, bu yüzden bu çalıştırma artık geri alınamaz")
	errChoicesInUse    = errors.New("bu öğrenciler için gelecek yılın notları zaten girilmiş, bu yüzden ders seçimleri artık geri alınamaz")

	// ErrInvalidProposal means a row ticked for apply breaks a rule; the message names the row.
	ErrInvalidProposal = errors.New("öneride uygulanamayacak satırlar var")
)
