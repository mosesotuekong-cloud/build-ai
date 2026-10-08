// Join codes: six characters, no 0/O or 1/I so they read clearly on a projector.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateJoinCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return code;
}

// Accepts what people actually type: spaces, dashes, lower case, and the
// look-alike digits 0 and 1.
export function normaliseJoinCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/0/g, "O")
    .replace(/1/g, "I")
    .slice(0, 6);
}

export function isValidJoinCode(code: string): boolean {
  return /^[A-HJ-NP-Z2-9]{6}$/.test(code);
}
