function gradeNumber(name: string): number | null {
  const m = name.match(/\d+/);
  return m ? Number(m[0]) : null;
}

// Warns when a grade name falls outside the school's configured range.
export function gradeNameWarning(name: string, from: number | null, to: number | null): string | null {
  const n = gradeNumber(name);
  if (n === null) return "Bu adda sayı yok";
  if (from !== null && n < from) return `Okulun seviye aralığının altında (${from}-${to})`;
  if (to !== null && n > to) return `Okulun seviye aralığının üstünde (${from}-${to})`;
  return null;
}
