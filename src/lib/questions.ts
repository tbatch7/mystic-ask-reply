export type Category =
  | "relationship_secrets"
  | "jealousy"
  | "fantasies"
  | "past_experiences"
  | "attractions";

export const CATEGORY_META: Record<Category, { label: string; emoji: string; blurb: string }> = {
  relationship_secrets: {
    label: "Relationship Secrets",
    emoji: "🤫",
    blurb: "The things you've kept folded away.",
  },
  jealousy: {
    label: "Jealousy",
    emoji: "😈",
    blurb: "The names and moments that sting.",
  },
  fantasies: {
    label: "Fantasies & Turn-ons",
    emoji: "🔥",
    blurb: "The scenes that play in your head.",
  },
  past_experiences: {
    label: "Past Experiences",
    emoji: "🕯️",
    blurb: "Stories from before them.",
  },
  attractions: {
    label: "Attractions",
    emoji: "💋",
    blurb: "The people who catch your eye.",
  },
};

export interface Question {
  key: string;
  category: Category;
  text: string;
}

export const QUESTIONS: Question[] = [
  // Relationship Secrets (7)
  { key: "rs_lied_important", category: "relationship_secrets", text: "Have you ever lied to your partner about something genuinely important?" },
  { key: "rs_secret_never_told", category: "relationship_secrets", text: "Is there a secret about yourself you've never told them, and don't plan to?" },
  { key: "rs_doubted_us", category: "relationship_secrets", text: "Have you ever seriously doubted whether you should stay with them?" },
  { key: "rs_hidden_finance", category: "relationship_secrets", text: "Is there money, a purchase, or a debt you've kept hidden from them?" },
  { key: "rs_almost_cheated", category: "relationship_secrets", text: "Have you ever come close to cheating, even if you didn't go through with it?" },
  { key: "rs_wish_change", category: "relationship_secrets", text: "Is there one thing about them you secretly wish you could change?" },
  { key: "rs_diary_panic", category: "relationship_secrets", text: "If they read your private messages and notes from the last year, what would you panic about?" },

  // Jealousy (7)
  { key: "jl_friend_uncomfortable", category: "jealousy", text: "Which one of their friends makes you the most uncomfortable, and why?" },
  { key: "jl_ex_specific", category: "jealousy", text: "Which specific ex of theirs do you wish they'd stop being in contact with?" },
  { key: "jl_snooped_phone", category: "jealousy", text: "Have you ever gone through their phone, DMs, or laptop without them knowing?" },
  { key: "jl_followed_online", category: "jealousy", text: "Is there someone in their life you regularly check up on online?" },
  { key: "jl_situation_hurt", category: "jealousy", text: "What recent situation involving them genuinely hurt you, but you stayed quiet about it?" },
  { key: "jl_who_threat", category: "jealousy", text: "If they were going to leave you for someone, who do you secretly think it would be?" },
  { key: "jl_compare_self", category: "jealousy", text: "Is there someone you constantly compare yourself to in their world?" },

  // Fantasies & Turn-ons (7)
  { key: "ft_someone_you_know", category: "fantasies", text: "Have you ever had a sexual fantasy involving someone you both know in real life?" },
  { key: "ft_kink_never_asked", category: "fantasies", text: "What kink or specific desire have you never asked them to try with you?" },
  { key: "ft_recurring_scene", category: "fantasies", text: "Is there a scenario you replay in your head when you're alone? Describe how detailed it gets." },
  { key: "ft_threesome_who", category: "fantasies", text: "If a threesome were on the table, who would you want it to be with?" },
  { key: "ft_watch_or_watched", category: "fantasies", text: "Do you fantasize about watching them with someone else — or being watched by someone?" },
  { key: "ft_role_pretend", category: "fantasies", text: "Is there a role or scenario you wish they would play out with you in bed?" },
  { key: "ft_taboo_thought", category: "fantasies", text: "What's the most taboo thought you've had that turned you on more than you expected?" },

  // Past Experiences (6)
  { key: "pe_partner_count", category: "past_experiences", text: "What's your honest, real number of past sexual partners?" },
  { key: "pe_hidden_hookup", category: "past_experiences", text: "Is there a past hookup or fling you've never told them about?" },
  { key: "pe_someone_still_think", category: "past_experiences", text: "Is there someone from your past you still think about in a sexual or romantic way?" },
  { key: "pe_wildest_thing_done", category: "past_experiences", text: "What's the wildest thing you've ever done sexually that they don't know about?" },
  { key: "pe_one_more_time", category: "past_experiences", text: "If you could secretly sleep with one ex one more time with no consequences, would you?" },
  { key: "pe_lied_about_past", category: "past_experiences", text: "Have you ever shaded the truth about your past to make yourself look better to them?" },

  // Attractions (6)
  { key: "at_celebrity_yes", category: "attractions", text: "Which celebrity would you say yes to if they walked up to you tonight?" },
  { key: "at_friend_of_yours", category: "attractions", text: "Which one of your own friends have you found yourself attracted to?" },
  { key: "at_their_friend", category: "attractions", text: "Which one of their friends have you privately found attractive?" },
  { key: "at_coworker", category: "attractions", text: "Is there a coworker you've thought about in a way you wouldn't say out loud?" },
  { key: "at_stranger_recent", category: "attractions", text: "Has a stranger turned your head recently in a way that lingered?" },
  { key: "at_type_not_them", category: "attractions", text: "Is there a 'type' you're drawn to that your partner is not?" },
];

export const QUESTION_KEYS = new Set(QUESTIONS.map((q) => q.key));
export const CATEGORIES: Category[] = [
  "relationship_secrets",
  "jealousy",
  "fantasies",
  "past_experiences",
  "attractions",
];

export const SLIDER_STOPS = [
  { value: 0, label: "Never" },
  { value: 25, label: "Only if pushed" },
  { value: 50, label: "Maybe someday" },
  { value: 75, label: "I'm open" },
  { value: 100, label: "I already told them" },
] as const;

export function labelForValue(v: number): string {
  // pick closest stop
  let best = SLIDER_STOPS[0];
  let bestDist = Math.abs(v - best.value);
  for (const s of SLIDER_STOPS) {
    const d = Math.abs(v - s.value);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return best.label;
}
