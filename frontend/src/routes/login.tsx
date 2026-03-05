import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChefHat, LogIn } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.auth.login(username, password);
      setAuth(data.token, data.username);
      toast.success("Welcome!");
      navigate({ to: "/" });
    } catch {
      toast.error("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto mt-20 max-w-sm"
    >
      <div className="flex flex-col items-center">
        <ChefHat className="h-10 w-10 text-accent" />
        <h1 className="mt-4 font-display text-2xl font-bold">Sous Clip</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to your instance</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button
          type="submit"
          disabled={loading || !username || !password}
          className="w-full bg-accent text-white hover:bg-accent/90 active:scale-[0.97]"
        >
          <LogIn className="mr-2 h-4 w-4" />
          Sign In
        </Button>
      </form>
    </motion.div>
  );
}
