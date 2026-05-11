import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Flame } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) nav({ to: "/dashboard" });
  }, [user, loading, nav]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else nav({ to: "/dashboard" });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Account created.");
      nav({ to: "/dashboard" });
    }
  };

  const handleGuest = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInAnonymously();
    setBusy(false);
    if (error) toast.error(error.message);
    else nav({ to: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <Flame className="h-6 w-6 text-primary" />
          <span className="font-serif text-xl">SecretSpice</span>
        </Link>
        <div className="rounded-2xl border border-border bg-card/70 p-6 shadow-xl backdrop-blur">
          <h1 className="mb-1 text-center font-serif text-2xl">Step inside</h1>
          <p className="mb-5 text-center text-sm text-muted-foreground">
            Sign in to send your partner a game.
          </p>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-4">
              <form onSubmit={handleSignIn} className="space-y-3">
                <div>
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="si-pw">Password</Label>
                  <Input id="si-pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={busy} className="btn-primary-glow w-full">Sign in</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup" className="mt-4">
              <form onSubmit={handleSignUp} className="space-y-3">
                <div>
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="su-pw">Password</Label>
                  <Input id="su-pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={busy} className="btn-primary-glow w-full">Create account</Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" disabled={busy} onClick={handleGuest}>
            Continue as guest
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Guest accounts can play but won't survive if you clear browser data.
          </p>
        </div>
      </div>
    </div>
  );
}
