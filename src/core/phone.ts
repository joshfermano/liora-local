// Philippine phone numbers, written the way people there read them. Returns null when it is not one.
// Mobile: 09XX XXX XXXX (or +63 9XX XXX XXXX when she typed the country code).
// Landline: (02) 8XXX XXXX in Metro Manila, (0XX) XXX XXXX elsewhere.
export function formatPhPhone(input: string): string | null {
  const international = input.trim().startsWith('+');
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('63') && (digits.length === 12 || digits.length === 11)) digits = `0${digits.slice(2)}`;
  else if (digits.length === 10 && digits.startsWith('9')) digits = `0${digits}`;

  if (digits.length === 11 && digits.startsWith('09')) {
    const [a, b, c] = [digits.slice(1, 4), digits.slice(4, 7), digits.slice(7)];
    return international ? `+63 ${a} ${b} ${c}` : `0${a} ${b} ${c}`;
  }
  if (digits.length === 10 && digits.startsWith('02')) {
    const [a, b] = [digits.slice(2, 6), digits.slice(6)];
    return international ? `+63 2 ${a} ${b}` : `(02) ${a} ${b}`;
  }
  if (digits.length === 10 && /^0[3-8]/.test(digits)) {
    const [area, a, b] = [digits.slice(1, 3), digits.slice(3, 6), digits.slice(6)];
    return international ? `+63 ${area} ${a} ${b}` : `(0${area}) ${a} ${b}`;
  }
  return null;
}

const group = (digits: string, sizes: number[]) => {
  const parts: string[] = [];
  let at = 0;
  for (const size of sizes) {
    if (at >= digits.length) break;
    parts.push(digits.slice(at, at + size));
    at += size;
  }
  return parts.join(' ');
};

// The number as she types it: only digits and a leading plus, grouped as she goes and stopped at the
// length a Philippine number can have. formatPhPhone still decides whether it is complete.
export function typePhPhone(raw: string): string {
  const international = raw.trimStart().startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (international) {
    const d = digits.slice(0, 12);
    if (d.length <= 2) return `+${d}`;
    const rest = d.slice(2);
    const sizes = rest.startsWith('2') ? [1, 4, 4] : rest.startsWith('9') ? [3, 3, 4] : [2, 3, 4];
    return `+${d.slice(0, 2)} ${group(rest, sizes)}`;
  }
  if (digits.startsWith('02')) {
    const d = digits.slice(0, 10);
    return d.length <= 2 ? d : `(02) ${group(d.slice(2), [4, 4])}`;
  }
  if (/^0[3-8]/.test(digits)) {
    const d = digits.slice(0, 10);
    return d.length <= 3 ? d : `(${d.slice(0, 3)}) ${group(d.slice(3), [3, 4])}`;
  }
  if (digits.startsWith('9')) return group(digits.slice(0, 10), [3, 3, 4]);
  const d = digits.slice(0, 11);
  return d.length <= 4 ? d : group(d, [4, 3, 4]);
}
