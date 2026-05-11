import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Flame, Lock, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && user) nav({ to: "/dashboard" });
  }, [user, loading, nav]);

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6">
        <div className="flex items-center gap-2">
          <Flame className="h-6 w-6 text-primary" />
          <span className="font-serif text-xl">SecretSpice</span>
        </div>
        <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
      </header>

      <main className="mx-auto max-w-3xl px-5 pt-10 pb-24 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-gold" /> A honesty game for couples
        </span>
        <h1 className="mt-6 font-serif text-5xl leading-tight md:text-6xl">
          The questions you've never <em className="text-primary">dared</em> to ask.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
          Send your partner a private link with 30+ deeply personal questions — about jealousy, fantasies,
          attractions, hidden truths. See exactly how willing they are to share each one.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="btn-primary-glow h-12 px-8 text-base">
            <Link to="/auth">Start a game</Link>
          </Button>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" /> Private. Their answers only go to you.
          </span>
        </div>

        <div className="mt-16 grid gap-4 text-left sm:grid-cols-3">
          {[
            { e: "🤫", t: "Send a link", d: "Create a game in one tap and share the private link." },
            { e: "🔥", t: "They answer", d: "30+ slider questions across 5 spicy categories." },
            { e: "💋", t: "You see all", d: "Live results with an Openness Score and Secrets Level." },
          ].map((c) => (
            <div key={c.t} className="rounded-2xl border border-border bg-card/50 p-5">
              <div className="text-2xl">{c.e}</div>
              <div className="mt-2 font-serif text-lg">{c.t}</div>
              <div className="mt-1 text-sm text-muted-foreground">{c.d}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
