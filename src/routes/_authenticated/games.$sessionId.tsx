import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { getMySession } from "@/lib/game.functions";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, CATEGORY_META, QUESTIONS, labelForValue, type Category } from "@/lib/questions";
import { LEVEL_META, levelFromScore, type SecretsLevel } from "@/lib/scoring";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/games/$sessionId")({ component: GameView });

function GameView() {
  const { sessionId } = Route.useParams();
  const nav = useNavigate();
  const fn = useServerFn(getMySession);
  const q = useQuery({
    queryKey: ["game", sessionId],
    queryFn: () => fn({ data: { id: sessionId } }),
    refetchOnWindowFocus: false,
  });

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel(`game-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "answers", filter: `session_id=eq.${sessionId}` }, () => q.refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` }, () => q.refetch())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [sessionId, q]);

  if (q.isLoading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (q.error) return <div className="p-10 text-center text-destructive">{(q.error as Error).message}</div>;
  if (!q.data) return null;

  const { session, answers } = q.data;
  const completed = session.status === "completed";

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <Button variant="ghost" size="sm" onClick={() => nav({ to: "/dashboard" })} className="mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back
      </Button>

      <div className="rounded-2xl border border-border bg-card/60 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl">
              {session.responder_name ? `${session.responder_name}'s answers` : "Their answers"}
            </h1>
            <div className="mt-1 text-sm text-muted-foreground">
              Link: <code className="font-mono">{session.token}</code>
              {session.is_test && <span className="test-badge ml-2 rounded-full px-2 py-0.5 text-[10px] uppercase">Test</span>}
            </div>
          </div>
          {!completed && (
            <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
              Waiting for them to submit… (live)
            </span>
          )}
        </div>

        {completed ? (
          <ResultsBlock score={session.openness_score ?? 0} answers={answers} />
        ) : (
          <p className="mt-6 text-muted-foreground">
            Send them this link to play:{" "}
            <Link to="/play/$token" params={{ token: session.token }} className="text-primary underline">
              {window.location.origin}/play/{session.token}
            </Link>
          </p>
        )}
      </div>

      {completed && <PerQuestion answers={answers} />}
    </div>
  );
}

export function ResultsBlock({
  score,
  answers,
  hideHeading,
}: {
  score: number;
  answers: { question_key: string; category: string; value: number; skipped: boolean }[];
  hideHeading?: boolean;
}) {
  const level: SecretsLevel = levelFromScore(score);
  const meta = LEVEL_META[level];

  const byCat = useMemo(() => {
    const result: Record<Category, { score: number; answered: number; skipped: number }> = {
      relationship_secrets: { score: 0, answered: 0, skipped: 0 },
      jealousy: { score: 0, answered: 0, skipped: 0 },
      fantasies: { score: 0, answered: 0, skipped: 0 },
      past_experiences: { score: 0, answered: 0, skipped: 0 },
      attractions: { score: 0, answered: 0, skipped: 0 },
    };
    const sums: Record<Category, number> = {
      relationship_secrets: 0, jealousy: 0, fantasies: 0, past_experiences: 0, attractions: 0,
    };
    for (const a of answers) {
      const c = a.category as Category;
      if (!result[c]) continue;
      if (a.skipped) result[c].skipped++;
      else {
        sums[c] += a.value;
        result[c].answered++;
      }
    }
    for (const c of CATEGORIES) {
      result[c].score = result[c].answered ? Math.round(sums[c] / result[c].answered) : 0;
    }
    return result;
  }, [answers]);

  return (
    <div className="mt-6 animate-in fade-in duration-500">
      {!hideHeading && (
        <div className="text-center">
          <div className="text-6xl">{meta.emoji}</div>
          <div className="mt-2 font-serif text-4xl">{level} · {score}%</div>
          <div className="mt-1 text-sm text-muted-foreground">{meta.tagline}</div>
        </div>
      )}

      <div className="mt-5">
        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full" style={{ width: `${score}%`, background: "var(--gradient-hot)" }} />
        </div>
        <div className="mt-1 text-right text-xs text-muted-foreground">Openness Score</div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {CATEGORIES.map((c) => {
          const m = CATEGORY_META[c];
          const r = byCat[c];
          return (
            <div key={c} className="rounded-xl border border-border bg-background/40 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{m.emoji}</span>
                  <span className="font-serif">{m.label}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {r.answered}/{r.answered + r.skipped}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${r.score}%`, background: "var(--gradient-hot)" }} />
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>{r.score}%</span>
                {r.skipped > 0 && <span>{r.skipped} skipped</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PerQuestion({ answers }: { answers: { question_key: string; category: string; value: number; skipped: boolean; text_answer?: string | null }[] }) {
  const map = new Map(answers.map((a) => [a.question_key, a]));
  return (
    <div className="mt-8 space-y-6">
      {CATEGORIES.map((c) => {
        const m = CATEGORY_META[c];
        const qs = QUESTIONS.filter((q) => q.category === c);
        return (
          <div key={c}>
            <h3 className="mb-2 font-serif text-lg">
              {m.emoji} {m.label}
            </h3>
            <ul className="space-y-2">
              {qs.map((q) => {
                const a = map.get(q.key);
                return (
                  <li key={q.key} className="rounded-xl border border-border bg-card/40 p-4">
                    <div className="text-sm">{q.text}</div>
                    {a?.text_answer && !a.skipped && (
                      <blockquote className="mt-2 whitespace-pre-wrap rounded-md border-l-2 border-primary/60 bg-background/40 px-3 py-2 text-sm italic">
                        "{a.text_answer}"
                      </blockquote>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      {a?.skipped ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">Skipped</span>
                      ) : (
                        <>
                          <span
                            className="rounded-full px-2 py-0.5 font-medium"
                            style={{
                              background: `color-mix(in oklab, var(--gradient-hot-stop), transparent 70%)`,
                              color: "var(--color-foreground)",
                              backgroundImage: "var(--gradient-hot)",
                              opacity: 0.95,
                            }}
                          >
                            {a ? labelForValue(a.value) : "—"}
                          </span>
                          {a && <span className="text-muted-foreground">{a.value}%</span>}
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
