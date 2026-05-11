export type SecretsLevel = "Guarded" | "Mild" | "Spicy" | "Burning";

export const LEVEL_META: Record<SecretsLevel, { emoji: string; tagline: string; color: string }> = {
  Guarded: { emoji: "🔒", tagline: "Walls up. Some doors stay closed.", color: "var(--color-cool)" },
  Mild: { emoji: "🌶️", tagline: "A little heat. Mostly safe ground.", color: "var(--color-warm)" },
  Spicy: { emoji: "💋", tagline: "Now we're getting somewhere.", color: "var(--color-spicy)" },
  Burning: { emoji: "🔥", tagline: "Nothing held back. Dangerous honesty.", color: "var(--color-hot)" },
};

export function levelFromScore(score: number): SecretsLevel {
  if (score >= 79) return "Burning";
  if (score >= 56) return "Spicy";
  if (score >= 34) return "Mild";
  return "Guarded";
}

export function computeOverallScore(answers: { value: number; skipped: boolean }[]): number {
  const real = answers.filter((a) => !a.skipped);
  if (real.length === 0) return 0;
  const avg = real.reduce((s, a) => s + a.value, 0) / real.length;
  return Math.round(avg);
}
