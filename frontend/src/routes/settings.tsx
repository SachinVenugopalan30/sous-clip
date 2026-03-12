import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Save, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Separator } from "../components/ui/separator";
import { Skeleton } from "../components/ui/skeleton";
import { useSettings, useUpdateSettings } from "../hooks/useSettings";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

const AI_PROVIDERS = [
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "openai", label: "OpenAI" },
  { value: "ollama", label: "Ollama (Local)" },
];

const WHISPER_MODELS = ["tiny", "base", "small", "medium", "large-v3"];
const WHISPER_DEVICES = ["auto", "cpu", "cuda"];
const WHISPER_COMPUTE = ["auto", "int8", "float16", "float32"];

function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const update = useUpdateSettings();
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const handleSave = () => {
    update.mutate(form, {
      onSuccess: () => toast.success("Settings saved"),
      onError: () => toast.error("Failed to save settings"),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="max-w-2xl"
    >
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Settings</h1>

      {/* AI Provider */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold">AI Provider</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Provider</label>
            <select
              value={form.ai_provider || ""}
              onChange={(e) => setForm({ ...form, ai_provider: e.target.value })}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
            >
              {AI_PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Model</label>
            <Input
              value={form.ai_model || ""}
              onChange={(e) => setForm({ ...form, ai_model: e.target.value })}
              placeholder="e.g. claude-sonnet-4-6, gpt-4o"
              className="mt-1"
            />
          </div>

          {form.ai_provider === "anthropic" && (
            <div>
              <label className="text-sm font-medium">Anthropic API Key</label>
              <Input
                type="password"
                value={form.anthropic_api_key || ""}
                onChange={(e) => setForm({ ...form, anthropic_api_key: e.target.value })}
                placeholder="sk-ant-..."
                className="mt-1"
              />
            </div>
          )}

          {form.ai_provider === "openai" && (
            <div>
              <label className="text-sm font-medium">OpenAI API Key</label>
              <Input
                type="password"
                value={form.openai_api_key || ""}
                onChange={(e) => setForm({ ...form, openai_api_key: e.target.value })}
                placeholder="sk-..."
                className="mt-1"
              />
            </div>
          )}

          {form.ai_provider === "ollama" && (
            <div>
              <label className="text-sm font-medium">Ollama Base URL</label>
              <Input
                value={form.ollama_base_url || ""}
                onChange={(e) => setForm({ ...form, ollama_base_url: e.target.value })}
                placeholder="http://localhost:11434"
                className="mt-1"
              />
            </div>
          )}
        </div>
      </section>

      <Separator className="my-8" />

      {/* Whisper Configuration */}
      <section>
        <h2 className="text-lg font-semibold">Whisper Transcription</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Model Size</label>
            <select
              value={form.whisper_model_size || "base"}
              onChange={(e) => setForm({ ...form, whisper_model_size: e.target.value })}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
            >
              {WHISPER_MODELS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Larger models are more accurate but slower. "base" is a good default.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Device</label>
            <select
              value={form.whisper_device || "auto"}
              onChange={(e) => setForm({ ...form, whisper_device: e.target.value })}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
            >
              {WHISPER_DEVICES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              "auto" detects GPU and falls back to CPU.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Compute Type</label>
            <select
              value={form.whisper_compute_type || "auto"}
              onChange={(e) => setForm({ ...form, whisper_compute_type: e.target.value })}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
            >
              {WHISPER_COMPUTE.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              "int8" for CPU speed, "float16" for GPU speed.
            </p>
          </div>
        </div>
      </section>

      <Separator className="my-8" />

      {/* Mealie Integration */}
      <MealieSection form={form} setForm={setForm} />

      <div className="mt-8">
        <Button
          onClick={handleSave}
          disabled={update.isPending}
          className="bg-accent text-white hover:bg-accent/90 active:scale-[0.97]"
        >
          <Save className="mr-2 h-4 w-4" />
          Save Settings
        </Button>
      </div>
    </motion.div>
  );
}

function MealieSection({
  form,
  setForm,
}: {
  form: Record<string, string>;
  setForm: (f: Record<string, string>) => void;
}) {
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  const handleTest = async () => {
    const url = form.mealie_url || "";
    const key = form.mealie_api_key || "";
    if (!url || !key) {
      toast.error("Enter both Mealie URL and API key first");
      return;
    }
    setTestStatus("loading");
    try {
      const result = await api.settings.testMealie(url, key);
      if (result.ok) {
        setTestStatus("success");
        setTestMessage(`Connected (v${result.version})`);
      } else {
        setTestStatus("error");
        setTestMessage(result.error || "Connection failed");
      }
    } catch {
      setTestStatus("error");
      setTestMessage("Connection failed");
    }
  };

  return (
    <section>
      <h2 className="text-lg font-semibold">Mealie Integration</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Optionally forward extracted recipes to a{" "}
        <a href="https://mealie.io/" target="_blank" rel="noopener noreferrer" className="underline hover:text-accent">
          Mealie
        </a>{" "}
        instance. Leave blank to skip.
      </p>
      <div className="mt-4 space-y-4">
        <div>
          <label className="text-sm font-medium">Mealie URL</label>
          <Input
            value={form.mealie_url || ""}
            onChange={(e) => {
              setForm({ ...form, mealie_url: e.target.value });
              setTestStatus("idle");
            }}
            placeholder="https://mealie.example.com"
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Mealie API Key</label>
          <Input
            type="password"
            value={form.mealie_api_key || ""}
            onChange={(e) => {
              setForm({ ...form, mealie_api_key: e.target.value });
              setTestStatus("idle");
            }}
            placeholder="Your Mealie API token"
            className="mt-1"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Generate a token in Mealie at User Profile → API Tokens.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={testStatus === "loading"}
          >
            {testStatus === "loading" ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : null}
            Test Connection
          </Button>
          {testStatus === "success" && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {testMessage}
            </span>
          )}
          {testStatus === "error" && (
            <span className="flex items-center gap-1 text-xs text-red-600">
              <XCircle className="h-3.5 w-3.5" />
              {testMessage}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
