export function stripDiacritics(value: string): string {
  // Normalize and strip combining marks without relying on Unicode properties
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return normalized.replace(/ø/g, "o").replace(/Ø/g, "O").replace(/æ/g, "ae").replace(/Æ/g, "AE");
}
