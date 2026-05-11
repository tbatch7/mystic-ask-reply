import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  createSession,
  listMySessions,
  deleteMySession,
  deleteAllMyData,
} from "@/lib/game.functions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, FlaskConical, Plus, Trash2, ExternalLink } from "lucide-react";
import { LEVEL_META } from "@/lib/scoring";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listMySessions);
  const create = useServerFn(createSession);
  const del = useServerFn(deleteMySession);
  const delAll = useServerFn(deleteAllMyData);

  const sessions = useQuery({ queryKey: ["sessions"], queryFn: () => list() });

  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: (isTest: boolean) => create({ data: { isTest } }),
    onSuccess: (res, isTest) => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      if (isTest) {
        nav({ to: "/play/$token", params: { token: res.token }, search: { test: 1, sid: res.sessionId } });
      } else {
        const url = `${window.location.origin}/play/${res.token}`;
        setShareUrl(url);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });
  const delAllMut = useMutation({
    mutationFn: () => delAll(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("All your data has been deleted.");
    },
  });

  const real = sessions.data?.filter((s) => !s.is_test) ?? [];
  const tests = sessions.data?.filter((s) => s.is_test) ?? [];

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl">Your dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Send a game, watch the answers come in.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <button
          disabled={createMut.isPending}
          onClick={() => createMut.mutate(false)}
          className="btn-primary-glow group flex flex-col items-start gap-2 rounded-2xl p-6 text-left disabled:opacity-60"
        >
          <Plus className="h-6 w-6" />
          <span className="font-serif text-2xl">Create New Game for My Partner</span>
          <span className="text-sm opacity-90">Generates a private link to share with them.</span>
        </button>
        <button
          disabled={createMut.isPending}
          onClick={() => createMut.mutate(true)}
          className="group flex flex-col items-start gap-2 rounded-2xl border border-gold/40 bg-card/60 p-6 text-left transition hover:border-gold disabled:opacity-60"
        >
          <FlaskConical className="h-6 w-6 text-gold" />
          <span className="font-serif text-2xl">Solo Test Mode</span>
          <span className="text-sm text-muted-foreground">
            Try the game on yourself right now. Goes straight to the questions, then back to results.
          </span>
        </button>
      </div>

      <Section title="Your games" subtitle={real.length === 0 ? "No games yet — send your first one above." : undefined}>
        <GameList items={real} onDelete={(id) => delMut.mutate(id)} />
      </Section>

      {tests.length > 0 && (
        <Section title="Test games" subtitle="Sessions you played yourself.">
          <GameList items={tests} onDelete={(id) => delMut.mutate(id)} />
        </Section>
      )}

      <div className="mt-16 rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
        <h3 className="font-serif text-lg text-destructive">Danger zone</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Permanently delete every game and answer tied to your account. Useful when you're done testing.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="mt-4">
              <Trash2 className="mr-2 h-4 w-4" /> Delete All My Data
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete everything?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all your games and their answers. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => delAllMut.mutate()} className="bg-destructive text-destructive-foreground">
                Yes, delete it all
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <ShareDialog url={shareUrl} onClose={() => setShareUrl(null)} />
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-serif text-xl">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function GameList({
  items,
  onDelete,
}: {
  items: Array<{
    id: string;
    token: string;
    status: string;
    responder_name: string | null;
    openness_score: number | null;
    secrets_level: string | null;
    is_test: boolean;
    created_at: string;
    completed_at: string | null;
  }>;
  onDelete: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-2">
      {items.map((s) => {
        const meta = s.secrets_level ? LEVEL_META[s.secrets_level as keyof typeof LEVEL_META] : null;
        return (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/60 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">{s.token}</span>
                {s.is_test && <span className="test-badge rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide">Test</span>}
              </div>
              <div className="mt-1 text-sm">
                {s.status === "completed" ? (
                  <span>
                    {meta?.emoji} <strong>{s.secrets_level}</strong> · {s.openness_score}% openness
                    {s.responder_name && <span className="text-muted-foreground"> — from {s.responder_name}</span>}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Awaiting answers…</span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {new Date(s.created_at).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="secondary">
                <Link to="/games/$sessionId" params={{ sessionId: s.id }}>
                  <ExternalLink className="mr-1 h-3 w-3" /> View
                </Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/play/${s.token}`);
                  toast.success("Link copied");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDelete(s.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ShareDialog({ url, onClose }: { url: string | null; onClose: () => void }) {
  return (
    <Dialog open={!!url} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Game ready 🔥</DialogTitle>
          <DialogDescription>
            Send this link to your partner. Their answers will appear on your dashboard as they submit.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input readOnly value={url ?? ""} onFocus={(e) => e.currentTarget.select()} />
          <Button
            onClick={() => {
              if (url) {
                navigator.clipboard.writeText(url);
                toast.success("Link copied");
              }
            }}
            className="btn-primary-glow"
          >
            <Copy className="mr-2 h-4 w-4" /> Copy
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
