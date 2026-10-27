#!/usr/bin/env bash
# OpenSchool Seed Script: Populates a demo class with teachers, students, parents, attendance, and term marks.
# All seeded entities use deterministic UUIDs so they can be safely removed by scripts/unseed_demo_class.sh.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ -f "$ROOT_DIR/backend/.env" ]; then
  set -a
  source <(grep -v '^#' "$ROOT_DIR/backend/.env" | grep -v '^\s*$')
  set +a
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-openschool}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

EXEC_CMD=""

if docker ps --format '{{.Names}}' | grep -q "^openschool-postgres$"; then
  EXEC_CMD="docker exec -i openschool-postgres psql -U $DB_USER -d $DB_NAME"
elif command -v psql >/dev/null 2>&1; then
  EXEC_CMD="PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
else
  echo "❌ Hata: Ne 'openschool-postgres' docker kapsayıcısı ne de yerel 'psql' kullanılabilir durumda."
  echo "   Lütfen önce Postgres'i başlatın: 'make setup' veya 'cd backend && docker compose up -d'."
  exit 1
fi

echo "🌱 OpenSchool veritabanına ($DB_NAME) demo sınıf verisi yükleniyor..."

$EXEC_CMD << 'EOF'
BEGIN;

-- 1. Ensure School exists (shared single-row school record)
INSERT INTO school (id, name, address, phone, email, created_at, updated_at)
VALUES ('00000000-0000-4000-a000-000000000001', 'OpenSchool Anadolu Lisesi', 'Cumhuriyet Caddesi No: 123, Ankara', '0112345678', 'info@openschool.edu.lk', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Demo Academic Year (2026)
INSERT INTO academic_years (id, year, start_date, end_date, is_current, created_at)
VALUES ('00000000-0000-4000-a000-000000002026', '2026', '2026-01-01', '2026-12-31', TRUE, NOW())
ON CONFLICT (year) DO UPDATE SET is_current = TRUE;

-- 3. Demo Grade 10
INSERT INTO grades (id, name, sort_order, created_at)
VALUES ('00000000-0000-4000-a000-000000000010', '10. Sınıf', 10, NOW())
ON CONFLICT (name) DO NOTHING;

-- 4. Demo Teachers
-- Form Teacher: Kemal Öztürk
INSERT INTO users (id, email, full_name, role, is_active, created_at, updated_at)
VALUES ('11111111-1111-4000-a000-000000000001', 'kemal.teacher@demo.openschool.edu.lk', 'Kemal Öztürk', 'teacher', TRUE, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO teacher_profiles (id, user_id, full_name, employee_number, joined_date, phone, created_at, updated_at)
VALUES ('11111111-2222-4000-a000-000000000001', '11111111-1111-4000-a000-000000000001', 'Kemal Öztürk', 'DEMO-EMP-1001', '2022-01-15', '0771112233', NOW(), NOW())
ON CONFLICT (employee_number) DO NOTHING;

-- Subject Teacher: Aylin Korkmaz
INSERT INTO users (id, email, full_name, role, is_active, created_at, updated_at)
VALUES ('11111111-1111-4000-a000-000000000002', 'aylin.teacher@demo.openschool.edu.lk', 'Aylin Korkmaz', 'teacher', TRUE, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO teacher_profiles (id, user_id, full_name, employee_number, joined_date, phone, created_at, updated_at)
VALUES ('11111111-2222-4000-a000-000000000002', '11111111-1111-4000-a000-000000000002', 'Aylin Korkmaz', 'DEMO-EMP-1002', '2023-03-01', '0772223344', NOW(), NOW())
ON CONFLICT (employee_number) DO NOTHING;

-- 5. Demo Class "10-A"
INSERT INTO classes (id, grade_id, academic_year_id, form_teacher_id, name, created_at)
VALUES (
  '00000000-0000-4000-a000-00000000100a',
  '00000000-0000-4000-a000-000000000010',
  '00000000-0000-4000-a000-000000002026',
  '11111111-2222-4000-a000-000000000001',
  '10-A',
  NOW()
)
ON CONFLICT (grade_id, academic_year_id, name) DO NOTHING;

-- 6. Demo Subjects ("Matematik", "Fen Bilimleri")
INSERT INTO subjects (id, code, name, category, created_at)
VALUES
  ('33333333-3333-4000-a000-000000000001', 'MATH10-DEMO', 'Matematik (Demo)', 'core', NOW()),
  ('33333333-3333-4000-a000-000000000002', 'SCI10-DEMO', 'Fen Bilimleri (Demo)', 'core', NOW())
ON CONFLICT (code) DO NOTHING;

-- Assign Teachers to Class Subjects
INSERT INTO class_subject_teachers (class_id, subject_id, teacher_id)
VALUES
  ('00000000-0000-4000-a000-00000000100a', '33333333-3333-4000-a000-000000000001', '11111111-2222-4000-a000-000000000001'),
  ('00000000-0000-4000-a000-00000000100a', '33333333-3333-4000-a000-000000000002', '11111111-2222-4000-a000-000000000002')
ON CONFLICT (class_id, subject_id) DO NOTHING;

-- 7. Deterministic Demo Students & Guardians
-- Student 1
INSERT INTO users (id, email, full_name, role, is_active)
VALUES ('22222222-1111-4000-a000-000000000001', 'ahmet.y@demo.openschool.edu.lk', 'Ahmet Yılmaz', 'student', TRUE)
ON CONFLICT (email) DO NOTHING;
INSERT INTO student_profiles (id, user_id, full_name, index_number, phone)
VALUES ('22222222-2222-4000-a000-000000000001', '22222222-1111-4000-a000-000000000001', 'Ahmet Yılmaz', 'DEMO-STU-1001', '0710000001')
ON CONFLICT (index_number) DO NOTHING;

INSERT INTO users (id, email, full_name, role, is_active)
VALUES ('33333333-1111-4000-a000-000000000001', 'mehmet.y@demo.openschool.edu.lk', 'Mehmet Yılmaz', 'parent', TRUE)
ON CONFLICT (email) DO NOTHING;
INSERT INTO guardians (id, user_id, full_name, relationship, phone, email)
VALUES ('33333333-2222-4000-a000-000000000001', '33333333-1111-4000-a000-000000000001', 'Mehmet Yılmaz', 'father', '0770000001', 'mehmet.y@demo.openschool.edu.lk')
ON CONFLICT (id) DO NOTHING;
INSERT INTO student_guardians (student_id, guardian_id, is_primary_contact)
VALUES ('22222222-2222-4000-a000-000000000001', '33333333-2222-4000-a000-000000000001', TRUE)
ON CONFLICT DO NOTHING;

-- Student 2
INSERT INTO users (id, email, full_name, role, is_active)
VALUES ('22222222-1111-4000-a000-000000000002', 'ayse.d@demo.openschool.edu.lk', 'Ayşe Demir', 'student', TRUE)
ON CONFLICT (email) DO NOTHING;
INSERT INTO student_profiles (id, user_id, full_name, index_number, phone)
VALUES ('22222222-2222-4000-a000-000000000002', '22222222-1111-4000-a000-000000000002', 'Ayşe Demir', 'DEMO-STU-1002', '0710000002')
ON CONFLICT (index_number) DO NOTHING;

INSERT INTO users (id, email, full_name, role, is_active)
VALUES ('33333333-1111-4000-a000-000000000002', 'fatma.d@demo.openschool.edu.lk', 'Fatma Demir', 'parent', TRUE)
ON CONFLICT (email) DO NOTHING;
INSERT INTO guardians (id, user_id, full_name, relationship, phone, email)
VALUES ('33333333-2222-4000-a000-000000000002', '33333333-1111-4000-a000-000000000002', 'Fatma Demir', 'mother', '0770000002', 'fatma.d@demo.openschool.edu.lk')
ON CONFLICT (id) DO NOTHING;
INSERT INTO student_guardians (student_id, guardian_id, is_primary_contact)
VALUES ('22222222-2222-4000-a000-000000000002', '33333333-2222-4000-a000-000000000002', TRUE)
ON CONFLICT DO NOTHING;

-- Student 3
INSERT INTO users (id, email, full_name, role, is_active)
VALUES ('22222222-1111-4000-a000-000000000003', 'zeynep.s@demo.openschool.edu.lk', 'Zeynep Şahin', 'student', TRUE)
ON CONFLICT (email) DO NOTHING;
INSERT INTO student_profiles (id, user_id, full_name, index_number, phone)
VALUES ('22222222-2222-4000-a000-000000000003', '22222222-1111-4000-a000-000000000003', 'Zeynep Şahin', 'DEMO-STU-1003', '0710000003')
ON CONFLICT (index_number) DO NOTHING;

INSERT INTO users (id, email, full_name, role, is_active)
VALUES ('33333333-1111-4000-a000-000000000003', 'hatice.s@demo.openschool.edu.lk', 'Hatice Şahin', 'parent', TRUE)
ON CONFLICT (email) DO NOTHING;
INSERT INTO guardians (id, user_id, full_name, relationship, phone, email)
VALUES ('33333333-2222-4000-a000-000000000003', '33333333-1111-4000-a000-000000000003', 'Hatice Şahin', 'mother', '0770000003', 'hatice.s@demo.openschool.edu.lk')
ON CONFLICT (id) DO NOTHING;
INSERT INTO student_guardians (student_id, guardian_id, is_primary_contact)
VALUES ('22222222-2222-4000-a000-000000000003', '33333333-2222-4000-a000-000000000003', TRUE)
ON CONFLICT DO NOTHING;

-- Student 4
INSERT INTO users (id, email, full_name, role, is_active)
VALUES ('22222222-1111-4000-a000-000000000004', 'mert.k@demo.openschool.edu.lk', 'Mert Kaya', 'student', TRUE)
ON CONFLICT (email) DO NOTHING;
INSERT INTO student_profiles (id, user_id, full_name, index_number, phone)
VALUES ('22222222-2222-4000-a000-000000000004', '22222222-1111-4000-a000-000000000004', 'Mert Kaya', 'DEMO-STU-1004', '0710000004')
ON CONFLICT (index_number) DO NOTHING;

INSERT INTO users (id, email, full_name, role, is_active)
VALUES ('33333333-1111-4000-a000-000000000004', 'mustafa.k@demo.openschool.edu.lk', 'Mustafa Kaya', 'parent', TRUE)
ON CONFLICT (email) DO NOTHING;
INSERT INTO guardians (id, user_id, full_name, relationship, phone, email)
VALUES ('33333333-2222-4000-a000-000000000004', '33333333-1111-4000-a000-000000000004', 'Mustafa Kaya', 'father', '0770000004', 'mustafa.k@demo.openschool.edu.lk')
ON CONFLICT (id) DO NOTHING;
INSERT INTO student_guardians (student_id, guardian_id, is_primary_contact)
VALUES ('22222222-2222-4000-a000-000000000004', '33333333-2222-4000-a000-000000000004', TRUE)
ON CONFLICT DO NOTHING;

-- Student 5
INSERT INTO users (id, email, full_name, role, is_active)
VALUES ('22222222-1111-4000-a000-000000000005', 'elif.c@demo.openschool.edu.lk', 'Elif Çelik', 'student', TRUE)
ON CONFLICT (email) DO NOTHING;
INSERT INTO student_profiles (id, user_id, full_name, index_number, phone)
VALUES ('22222222-2222-4000-a000-000000000005', '22222222-1111-4000-a000-000000000005', 'Elif Çelik', 'DEMO-STU-1005', '0710000005')
ON CONFLICT (index_number) DO NOTHING;

INSERT INTO users (id, email, full_name, role, is_active)
VALUES ('33333333-1111-4000-a000-000000000005', 'ali.c@demo.openschool.edu.lk', 'Ali Çelik', 'parent', TRUE)
ON CONFLICT (email) DO NOTHING;
INSERT INTO guardians (id, user_id, full_name, relationship, phone, email)
VALUES ('33333333-2222-4000-a000-000000000005', '33333333-1111-4000-a000-000000000005', 'Ali Çelik', 'father', '0770000005', 'ali.c@demo.openschool.edu.lk')
ON CONFLICT (id) DO NOTHING;
INSERT INTO student_guardians (student_id, guardian_id, is_primary_contact)
VALUES ('22222222-2222-4000-a000-000000000005', '33333333-2222-4000-a000-000000000005', TRUE)
ON CONFLICT DO NOTHING;

-- Student 6
INSERT INTO users (id, email, full_name, role, is_active)
VALUES ('22222222-1111-4000-a000-000000000006', 'burak.a@demo.openschool.edu.lk', 'Burak Aydın', 'student', TRUE)
ON CONFLICT (email) DO NOTHING;
INSERT INTO student_profiles (id, user_id, full_name, index_number, phone)
VALUES ('22222222-2222-4000-a000-000000000006', '22222222-1111-4000-a000-000000000006', 'Burak Aydın', 'DEMO-STU-1006', '0710000006')
ON CONFLICT (index_number) DO NOTHING;

INSERT INTO users (id, email, full_name, role, is_active)
VALUES ('33333333-1111-4000-a000-000000000006', 'zehra.a@demo.openschool.edu.lk', 'Zehra Aydın', 'parent', TRUE)
ON CONFLICT (email) DO NOTHING;
INSERT INTO guardians (id, user_id, full_name, relationship, phone, email)
VALUES ('33333333-2222-4000-a000-000000000006', '33333333-1111-4000-a000-000000000006', 'Zehra Aydın', 'mother', '0770000006', 'zehra.a@demo.openschool.edu.lk')
ON CONFLICT (id) DO NOTHING;
INSERT INTO student_guardians (student_id, guardian_id, is_primary_contact)
VALUES ('22222222-2222-4000-a000-000000000006', '33333333-2222-4000-a000-000000000006', TRUE)
ON CONFLICT DO NOTHING;

-- Student 7
INSERT INTO users (id, email, full_name, role, is_active)
VALUES ('22222222-1111-4000-a000-000000000007', 'deniz.a@demo.openschool.edu.lk', 'Deniz Arslan', 'student', TRUE)
ON CONFLICT (email) DO NOTHING;
INSERT INTO student_profiles (id, user_id, full_name, index_number, phone)
VALUES ('22222222-2222-4000-a000-000000000007', '22222222-1111-4000-a000-000000000007', 'Deniz Arslan', 'DEMO-STU-1007', '0710000007')
ON CONFLICT (index_number) DO NOTHING;

INSERT INTO users (id, email, full_name, role, is_active)
VALUES ('33333333-1111-4000-a000-000000000007', 'hasan.a@demo.openschool.edu.lk', 'Hasan Arslan', 'parent', TRUE)
ON CONFLICT (email) DO NOTHING;
INSERT INTO guardians (id, user_id, full_name, relationship, phone, email)
VALUES ('33333333-2222-4000-a000-000000000007', '33333333-1111-4000-a000-000000000007', 'Hasan Arslan', 'father', '0770000007', 'hasan.a@demo.openschool.edu.lk')
ON CONFLICT (id) DO NOTHING;
INSERT INTO student_guardians (student_id, guardian_id, is_primary_contact)
VALUES ('22222222-2222-4000-a000-000000000007', '33333333-2222-4000-a000-000000000007', TRUE)
ON CONFLICT DO NOTHING;

-- Enroll all 7 students into 10-A
INSERT INTO class_students (class_id, student_id)
VALUES
  ('00000000-0000-4000-a000-00000000100a', '22222222-2222-4000-a000-000000000001'),
  ('00000000-0000-4000-a000-00000000100a', '22222222-2222-4000-a000-000000000002'),
  ('00000000-0000-4000-a000-00000000100a', '22222222-2222-4000-a000-000000000003'),
  ('00000000-0000-4000-a000-00000000100a', '22222222-2222-4000-a000-000000000004'),
  ('00000000-0000-4000-a000-00000000100a', '22222222-2222-4000-a000-000000000005'),
  ('00000000-0000-4000-a000-00000000100a', '22222222-2222-4000-a000-000000000006'),
  ('00000000-0000-4000-a000-00000000100a', '22222222-2222-4000-a000-000000000007')
ON CONFLICT DO NOTHING;

-- 8. Seed 3 Days of Teacher Attendance (staff_attendance_records)
INSERT INTO staff_attendance_records (teacher_id, date, status, note)
VALUES
  ('11111111-2222-4000-a000-000000000001', CURRENT_DATE - INTERVAL '2 days', 'present', 'Zamanında'),
  ('11111111-2222-4000-a000-000000000001', CURRENT_DATE - INTERVAL '1 day',  'present', 'Zamanında'),
  ('11111111-2222-4000-a000-000000000001', CURRENT_DATE,                     'present', 'Zamanında'),
  ('11111111-2222-4000-a000-000000000002', CURRENT_DATE - INTERVAL '2 days', 'present', 'Zamanında'),
  ('11111111-2222-4000-a000-000000000002', CURRENT_DATE - INTERVAL '1 day',  'late',    'Trafik nedeniyle 10 dk gecikme'),
  ('11111111-2222-4000-a000-000000000002', CURRENT_DATE,                     'present', 'Zamanında')
ON CONFLICT (teacher_id, date) DO NOTHING;

-- 9. Seed 3 Days of Student Attendance (attendance_sessions & attendance_records)
-- Fixed Session IDs per day:
-- Day -2: 55555555-1111-4000-a000-000000000001
-- Day -1: 55555555-1111-4000-a000-000000000002
-- Day  0: 55555555-1111-4000-a000-000000000003
INSERT INTO attendance_sessions (id, class_id, taken_by, date)
VALUES
  ('55555555-1111-4000-a000-000000000001', '00000000-0000-4000-a000-00000000100a', '11111111-2222-4000-a000-000000000001', CURRENT_DATE - INTERVAL '2 days'),
  ('55555555-1111-4000-a000-000000000002', '00000000-0000-4000-a000-00000000100a', '11111111-2222-4000-a000-000000000001', CURRENT_DATE - INTERVAL '1 day'),
  ('55555555-1111-4000-a000-000000000003', '00000000-0000-4000-a000-00000000100a', '11111111-2222-4000-a000-000000000001', CURRENT_DATE)
ON CONFLICT (class_id, date) DO NOTHING;

INSERT INTO attendance_records (session_id, student_id, status)
VALUES
  ('55555555-1111-4000-a000-000000000001', '22222222-2222-4000-a000-000000000001', 'present'),
  ('55555555-1111-4000-a000-000000000001', '22222222-2222-4000-a000-000000000002', 'present'),
  ('55555555-1111-4000-a000-000000000001', '22222222-2222-4000-a000-000000000003', 'present'),
  ('55555555-1111-4000-a000-000000000001', '22222222-2222-4000-a000-000000000004', 'late'),
  ('55555555-1111-4000-a000-000000000001', '22222222-2222-4000-a000-000000000005', 'present'),
  ('55555555-1111-4000-a000-000000000001', '22222222-2222-4000-a000-000000000006', 'present'),
  ('55555555-1111-4000-a000-000000000001', '22222222-2222-4000-a000-000000000007', 'present'),

  ('55555555-1111-4000-a000-000000000002', '22222222-2222-4000-a000-000000000001', 'present'),
  ('55555555-1111-4000-a000-000000000002', '22222222-2222-4000-a000-000000000002', 'present'),
  ('55555555-1111-4000-a000-000000000002', '22222222-2222-4000-a000-000000000003', 'absent'),
  ('55555555-1111-4000-a000-000000000002', '22222222-2222-4000-a000-000000000004', 'present'),
  ('55555555-1111-4000-a000-000000000002', '22222222-2222-4000-a000-000000000005', 'present'),
  ('55555555-1111-4000-a000-000000000002', '22222222-2222-4000-a000-000000000006', 'present'),
  ('55555555-1111-4000-a000-000000000002', '22222222-2222-4000-a000-000000000007', 'present'),

  ('55555555-1111-4000-a000-000000000003', '22222222-2222-4000-a000-000000000001', 'present'),
  ('55555555-1111-4000-a000-000000000003', '22222222-2222-4000-a000-000000000002', 'late'),
  ('55555555-1111-4000-a000-000000000003', '22222222-2222-4000-a000-000000000003', 'present'),
  ('55555555-1111-4000-a000-000000000003', '22222222-2222-4000-a000-000000000004', 'present'),
  ('55555555-1111-4000-a000-000000000003', '22222222-2222-4000-a000-000000000005', 'present'),
  ('55555555-1111-4000-a000-000000000003', '22222222-2222-4000-a000-000000000006', 'present'),
  ('55555555-1111-4000-a000-000000000003', '22222222-2222-4000-a000-000000000007', 'present')
ON CONFLICT (session_id, student_id) DO NOTHING;

-- 10. Seed Term 1 & Term Marks for Mathematics & Science
INSERT INTO terms (id, academic_year_id, name, start_date, end_date, is_current, sort_order)
VALUES ('44444444-4444-4000-a000-000000000001', '00000000-0000-4000-a000-000000002026', '1. Dönem (Demo)', '2026-01-01', '2026-04-30', TRUE, 1)
ON CONFLICT (academic_year_id, name) DO NOTHING;

INSERT INTO term_marks (student_id, subject_id, term_id, marks, max_marks, entered_by)
VALUES
  ('22222222-2222-4000-a000-000000000001', '33333333-3333-4000-a000-000000000001', '44444444-4444-4000-a000-000000000001', 85, 100, '11111111-1111-4000-a000-000000000001'),
  ('22222222-2222-4000-a000-000000000001', '33333333-3333-4000-a000-000000000002', '44444444-4444-4000-a000-000000000001', 88, 100, '11111111-1111-4000-a000-000000000001'),

  ('22222222-2222-4000-a000-000000000002', '33333333-3333-4000-a000-000000000001', '44444444-4444-4000-a000-000000000001', 92, 100, '11111111-1111-4000-a000-000000000001'),
  ('22222222-2222-4000-a000-000000000002', '33333333-3333-4000-a000-000000000002', '44444444-4444-4000-a000-000000000001', 95, 100, '11111111-1111-4000-a000-000000000001'),

  ('22222222-2222-4000-a000-000000000003', '33333333-3333-4000-a000-000000000001', '44444444-4444-4000-a000-000000000001', 78, 100, '11111111-1111-4000-a000-000000000001'),
  ('22222222-2222-4000-a000-000000000003', '33333333-3333-4000-a000-000000000002', '44444444-4444-4000-a000-000000000001', 72, 100, '11111111-1111-4000-a000-000000000001'),

  ('22222222-2222-4000-a000-000000000004', '33333333-3333-4000-a000-000000000001', '44444444-4444-4000-a000-000000000001', 64, 100, '11111111-1111-4000-a000-000000000001'),
  ('22222222-2222-4000-a000-000000000004', '33333333-3333-4000-a000-000000000002', '44444444-4444-4000-a000-000000000001', 70, 100, '11111111-1111-4000-a000-000000000001'),

  ('22222222-2222-4000-a000-000000000005', '33333333-3333-4000-a000-000000000001', '44444444-4444-4000-a000-000000000001', 90, 100, '11111111-1111-4000-a000-000000000001'),
  ('22222222-2222-4000-a000-000000000005', '33333333-3333-4000-a000-000000000002', '44444444-4444-4000-a000-000000000001', 94, 100, '11111111-1111-4000-a000-000000000001'),

  ('22222222-2222-4000-a000-000000000006', '33333333-3333-4000-a000-000000000001', '44444444-4444-4000-a000-000000000001', 81, 100, '11111111-1111-4000-a000-000000000001'),
  ('22222222-2222-4000-a000-000000000006', '33333333-3333-4000-a000-000000000002', '44444444-4444-4000-a000-000000000001', 76, 100, '11111111-1111-4000-a000-000000000001'),

  ('22222222-2222-4000-a000-000000000007', '33333333-3333-4000-a000-000000000001', '44444444-4444-4000-a000-000000000001', 88, 100, '11111111-1111-4000-a000-000000000001'),
  ('22222222-2222-4000-a000-000000000007', '33333333-3333-4000-a000-000000000002', '44444444-4444-4000-a000-000000000001', 91, 100, '11111111-1111-4000-a000-000000000001')
ON CONFLICT (student_id, subject_id, term_id) DO NOTHING;

COMMIT;
EOF

echo "──────────────────────────────────────────────"
echo "✅ Demo sınıf '10-A' başarıyla yüklendi!"
echo "   - Sınıf: 10-A (2026 Eğitim-öğretim yılı)"
echo "   - Öğretmenler: 2 (Sınıf Öğretmeni: Kemal Öztürk, Branş Öğretmeni: Aylin Korkmaz)"
echo "   - Öğrenciler: 7 kaydedildi"
echo "   - Veliler: 7 tanımlandı"
echo "   - Yoklama: 3 Gün (Öğretmenler ve Öğrenciler)"
echo "   - Dönem Notları: 1. Dönem (Matematik ve Fen Bilimleri) notları"
echo "   - Temizlik: Demo verisini kaldırmak için 'make unseed' veya './scripts/unseed_demo_class.sh' komutunu çalıştırın."
echo "──────────────────────────────────────────────"
