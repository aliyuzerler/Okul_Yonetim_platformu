-- Default tiered catalog (docs/adr/0011): student-count tiers, annual price
-- = 10x monthly (two months free). Amounts in kuruş; adjust freely — the
-- application reads the catalog, it does not hardcode prices.
INSERT INTO platform_plans (id, code, name, description, max_students,
                            price_monthly_kurus, price_annual_kurus, trial_days, sort_order) VALUES
    ('11111111-1111-4111-8111-111111111101', 'baslangic',
     'Başlangıç', '250 öğrenciye kadar · tüm temel modüller · veli & öğrenci mobil',
     250, 149000, 1490000, 14, 1),
    ('11111111-1111-4111-8111-111111111102', 'standart',
     'Standart', '750 öğrenciye kadar · tüm temel modüller · iş akışları · analitik',
     750, 299000, 2990000, 14, 2),
    ('11111111-1111-4111-8111-111111111103', 'kurumsal',
     'Kurumsal', 'Öğrenci limiti yok · öncelikli destek · özel kurulum',
     0, 599000, 5990000, 14, 3);
