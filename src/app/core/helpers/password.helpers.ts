const UPPER  = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER  = 'abcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
const ALL    = UPPER + LOWER + DIGITS;

/** Genera una contraseña que cumple las reglas de Identity en el backend: mínimo 8 caracteres,
 *  al menos una mayúscula, una minúscula y un dígito (RequireNonAlphanumeric = false, no hace falta símbolo).
 *  Evita caracteres ambiguos (0/O, 1/l/I) para que sea fácil de copiar y leer. */
export function generatePassword(length = 12): string {
  const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), ...Array.from({ length: length - 3 }, () => pick(ALL))];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/** Mismo criterio que valida el backend (ASP.NET Identity): mínimo 8 caracteres,
 *  al menos una mayúscula, una minúscula y un dígito. */
export function isValidPassword(pw: string): boolean {
  return pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw);
}
