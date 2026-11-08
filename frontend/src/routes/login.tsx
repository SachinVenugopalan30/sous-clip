import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Field, Input } from "../components/ui/input";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

// Static, CSS-only stand-in for the drifting reels: no recipe data or photos before sign-in
const REELS = Array.from({ length: 6 }, (_, c) => Array.from({ length: 4 }, (_, r) => (c * 29 + r * 41) % 60));

function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api.auth.login(username, password);
      setAuth(data.token, data.username);
      toast.success("Welcome!");
      navigate({ to: "/" });
    } catch {
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login display">
      <div className="login-reels" aria-hidden="true">
        {REELS.map((col, c) => (
          <div key={c}>
            {col.map((m, r) => (
              <i key={r} style={{ "--m": m } as React.CSSProperties} />
            ))}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="lbox in">
        <h1>
          Sous <em>Clip</em>
        </h1>
        <p className="hint mb-5">Sign in to your instance</p>
        <Field label="Username" invalid={!!error}>
          <Input name="username" autoComplete="username" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} />
        </Field>
        <Field label="Password" error={error || undefined}>
          <Input type="password" name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Button type="submit" disabled={loading || !username || !password} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </main>
  );
}
