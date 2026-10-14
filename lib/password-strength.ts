// Shared password strength heuristic, used by SignUpForm and PasswordInput.

export const MIN_PASSWORD_LENGTH = 8;

/** Label per score, index 0-4. */
export const STRENGTH_LABELS = [
  "Too short",
  "Weak",
  "Fair",
  "Good",
  "Strong",
] as const;

/** Fill color per score, index 0-4 (Tailwind background classes). */
export const STRENGTH_COLORS = [
  "bg-destructive",
  "bg-destructive",
  "bg-amber-500",
  "bg-amber-400",
  "bg-(--color-success)",
] as const;

export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

/**
 * Length-weighted strength score, 0-4. NIST SP 800-63B advises against
 * composition requirements and treats length as the dominant factor, so extra
 * character classes only nudge the score — they can't rescue a short password.
 * This is a heuristic for feedback, not entropy estimation; pair it with a
 * breach-list check server-side for anything real.
 */
export function passwordStrength(
  password: string,
  minLength: number = MIN_PASSWORD_LENGTH,
): PasswordStrength {
  if (password.length < minLength) return 0;

  let score = 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) =>
    pattern.test(password),
  ).length;
  if (classes >= 3) score += 1;

  return Math.min(score, 4) as PasswordStrength;
}
