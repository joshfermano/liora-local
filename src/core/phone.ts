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
