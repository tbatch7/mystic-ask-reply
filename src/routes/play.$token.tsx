import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { getSessionByToken, submitAnswers } from "@/lib/game.functions";
import { CATEGORIES, CATEGORY_META, QUESTIONS, SLIDER_STOPS, labelForValue, type Category } from "@/lib/questions";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Flame, SkipForward } from "lucide-react";
import { ResultsBlock } from "./_authenticated/games.$sessionId";
import { LEVEL_META, levelFromScore } from "@/lib/scoring";
import { toast } from "sonner";

const search = z.object({
  test: z.coerce.number().optional(),
  sid: z.string().optional(),
});

export const Route = createFileRoute("/play/$token")({
  validateSearch: search,
  component: PlayPage,
});

function PlayPage() {
  const { token } = Route.useParams();
  const { test, sid } = Route.useSearch();
  const nav = useNavigate();
  const get = useServerFn(getSessionByToken);
  const submit = useServerFn(submitAnswers);

  const sQ = useQuery({
    queryKey: ["play", token],
    queryFn: () => get({ data: { token } }),
    retry: false,
  });

  const [step, setStep] = useState<"intro" | "questions" | "done">("intro");
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState<Record<string, { value: number; skipped: boolean; text: string }>>(() => {
    const o: Record<string, { value: number; skipped: boolean; text: string }> = {};
    for (const q of QUESTIONS) o[q.key] = { value: 50, skipped: false, text: "" };
    return o;
  });
  const [submittedScore, setSubmittedScore] = useState<{ score: number; answers: { question_key: string; category: string; value: number; skipped: boolean; text_answer: string | null }[] } | null>(null);

  const submitMut = useMutation({
    mutationFn: () =>
      submit({
        data: {
          token,
          responderName: name || null,
          answers: QUESTIONS.map((q) => ({ question_key: q.key, value: answers[q.key].value, skipped: answers[q.key].skipped, text_answer: answers[q.key].text })),
        },
      }),
    onSuccess: (res) => {
      const submittedAnswers = QUESTIONS.map((q) => ({
        question_key: q.key,
        category: q.category as string,
        value: answers[q.key].value,
        skipped: answers[q.key].skipped,
        text_answer: answers[q.key].text?.trim() || null,
      }));
      setSubmittedScore({ score: res.score, answers: submittedAnswers });
      setStep("done");
      // Solo Test Mode auto-redirect to results
      if (test && sid) {
        setTimeout(() => nav({ to: "/games/$sessionId", params: { sessionId: sid } }), 1500);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ordered = useMemo(() => {
    const out: typeof QUESTIONS = [];
    for (const c of CATEGORIES) for (const q of QUESTIONS) if (q.category === c) out.push(q);
    return out;
  }, []);

  if (sQ.isLoading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (sQ.error) return <ErrorScreen msg={(sQ.error as Error).message} />;
  if (!sQ.data) return null;
  if (sQ.data.status === "completed" && step !== "done") {
    return <ErrorScreen msg="This game has already been completed." />;
  }

  return (
    <div className="min-h-screen pb-32">
      {test && (
        <div className="sticky top-0 z-30 border-b border-gold/40 bg-background/80 px-5 py-2 text-center text-xs backdrop-blur">
          <span className="test-badge inline-block rounded-full px-2 py-0.5 uppercase tracking-wide">Solo Test Mode</span>
          <span className="ml-2 text-muted-foreground">After submitting you'll see the sender's results view.</span>
        </div>
      )}

      <div className="mx-auto max-w-2xl px-5 pt-6">
        <div className="mb-3 flex items-center justify-center gap-2">
          <Flame className="h-5 w-5 text-primary" />
          <span className="font-serif text-lg">SecretSpice</span>
        </div>

        <div className="warning-banner mb-6 flex items-start gap-2 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Your answers will be shared with the person who sent you this link. Only respond if you're okay with that.
          </span>
        </div>

        {step === "intro" && (
          <Intro
            name={name}
            setName={setName}
            onStart={() => setStep("questions")}
          />
        )}

        {step === "questions" && (
          <Questions
            ordered={ordered}
            answers={answers}
            setAnswers={setAnswers}
            onSubmit={() => submitMut.mutate()}
            submitting={submitMut.isPending}
          />
        )}

        {step === "done" && submittedScore && (
          <DoneScreen score={submittedScore.score} answers={submittedScore.answers} isTest={!!test} />
        )}
      </div>
    </div>
  );
}

function ErrorScreen({ msg }: { msg: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-5 text-center">
      <div>
        <div className="text-5xl">🔒</div>
        <h1 className="mt-4 font-serif text-2xl">{msg}</h1>
      </div>
    </div>
  );
}

function Intro({ name, setName, onStart }: { name: string; setName: (s: string) => void; onStart: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-6 text-center">
      <h1 className="font-serif text-3xl">Someone wants to know the truth.</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
        You'll see {QUESTIONS.length} personal questions. For each one, drag the slider to show how willing you'd be
        to actually tell them. Skip any you don't want to answer.
      </p>
      <div className="mx-auto mt-5 max-w-xs text-left">
        <Label htmlFor="name">First name (optional)</Label>
        <Input id="name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="So they know it's you" />
      </div>
      <Button onClick={onStart} className="btn-primary-glow mt-6 h-11 px-8 text-base">
        I'm ready
      </Button>
    </div>
  );
}

function Questions({
  ordered,
  answers,
  setAnswers,
  onSubmit,
  submitting,
}: {
  ordered: typeof QUESTIONS;
  answers: Record<string, { value: number; skipped: boolean }>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, { value: number; skipped: boolean }>>>;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const total = ordered.length;
  const answeredOrSkippedCount = Object.values(answers).filter((a) => a.skipped || a.value !== 50).length;

  const setVal = (key: string, value: number) => {
    setAnswers((p) => ({ ...p, [key]: { value, skipped: false } }));
  };
  const setSkipped = (key: string) => {
    setAnswers((p) => ({ ...p, [key]: { value: 0, skipped: true } }));
  };

  const touched = Object.entries(answers).filter(([, a]) => a.skipped || a.value !== 50).length;
  const displayCurrent = Math.min(touched + 1, total);

  return (
    <div>
      <div className="sticky top-0 z-20 -mx-5 mb-4 border-b border-border/60 bg-background/85 px-5 py-3 backdrop-blur">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Question {displayCurrent} of {total}</span>
          <span>{Math.round((touched / total) * 100)}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full transition-all" style={{ width: `${(touched / total) * 100}%`, background: "var(--gradient-hot)" }} />
        </div>
      </div>

      {CATEGORIES.map((c) => {
        const m = CATEGORY_META[c];
        const qs = ordered.filter((q) => q.category === c);
        return (
          <section key={c} className="mb-8">
            <div className="mb-3">
              <h2 className="font-serif text-2xl">{m.emoji} {m.label}</h2>
              <p className="text-xs text-muted-foreground">{m.blurb}</p>
            </div>
            <div className="space-y-3">
              {qs.map((q) => {
                const a = answers[q.key];
                return (
                  <div key={q.key} className="rounded-xl border border-border bg-card/60 p-4">
                    <div className={`text-base ${a.skipped ? "opacity-60 line-through" : ""}`}>{q.text}</div>
                    <div className="mt-4">
                      <Slider
                        className="slider-hot"
                        value={[a.skipped ? 0 : a.value]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(v) => setVal(q.key, v[0])}
                        disabled={a.skipped}
                      />
                      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                        {SLIDER_STOPS.map((s) => (<span key={s.value}>{s.label}</span>))}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {a.skipped ? "Skipped" : <strong className="text-foreground">{labelForValue(a.value)}</strong>}
                      </span>
                      {a.skipped ? (
                        <button onClick={() => setVal(q.key, 50)} className="text-xs text-primary underline">
                          Undo skip
                        </button>
                      ) : (
                        <button onClick={() => setSkipped(q.key)} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                          <SkipForward className="h-3 w-3" /> Skip
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">{touched}/{total} touched</div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="btn-primary-glow h-11 px-6">Submit All Answers</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Send your answers?</AlertDialogTitle>
                <AlertDialogDescription>
                  These answers will be visible to the person who sent you this link. Once submitted, you can't change them.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Wait</AlertDialogCancel>
                <AlertDialogAction onClick={onSubmit} disabled={submitting} className="btn-primary-glow">
                  Yes, send
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

function DoneScreen({ score, answers, isTest }: { score: number; answers: { question_key: string; category: string; value: number; skipped: boolean }[]; isTest: boolean }) {
  const level = levelFromScore(score);
  const meta = LEVEL_META[level];
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-6">
      <div className="text-center">
        <div className="text-7xl">{meta.emoji}</div>
        <h1 className="mt-3 font-serif text-4xl">{level}</h1>
        <div className="mt-1 font-serif text-3xl text-primary">{score}%</div>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{meta.tagline}</p>
        {isTest && <p className="mt-3 text-xs text-gold">Redirecting you to the sender results view…</p>}
      </div>
      <ResultsBlock score={score} answers={answers} hideHeading />
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Your answers have been delivered. You can close this page now.
      </p>
    </div>
  );
}
