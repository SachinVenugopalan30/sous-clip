import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Save, CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Separator } from "../components/ui/separator";
import { Skeleton } from "../components/ui/skeleton";
import { useApplyUpdate } from "../hooks/useApplyUpdate";
import { useTestResult } from "../hooks/useTestResult";
import { AI_PROVIDERS, API_STYLE_LABELS, WHISPER_COMPUTE, WHISPER_DEVICES, WHISPER_MODELS } from "../lib/settingsOptions";
import { useSettings, useUpdateSettings, useUpdateStatus } from "../hooks/useSettings";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

type FormProps = {
  form: Record<string, string>;
  setForm: (f: Record<string, string>) => void;
};

function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const update = useUpdateSettings();
  // Unsaved changes layered over the server settings; cleared once a save has refetched them
  const [edits, setEdits] = useState<Record<string, string>>({});
  const form = { ...settings, ...edits };
  const setForm = setEdits;

  const handleSave = () => {
    update.mutate(form, {
      onSuccess: () => {
        setEdits({});
        toast.success("Settings saved");
      },
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

          {form.ai_provider === "custom" && <CustomEndpointFields form={form} setForm={setForm} />}
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

      <Separator className="my-8" />

      <UpdatesSection form={form} setForm={setForm} />

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

function MealieSection({ form, setForm }: FormProps) {
  const test = useTestResult();

  const handleTest = async () => {
    const url = form.mealie_url || "";
    const key = form.mealie_api_key || "";
    if (!url || !key) {
      toast.error("Enter both Mealie URL and API key first");
      return;
    }
    test.set("loading");
    try {
      const result = await api.settings.testMealie(url, key);
      if (result.ok) test.set("success", `Connected (v${result.version})`);
      else test.set("error", result.error || "Connection failed");
    } catch {
      test.set("error", "Connection failed");
    }
  };

  return (
    <section>
      <h2 className="text-lg font-semibold">Mealie Integration</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Optionally forward extracted recipes to a{" "}
        <a href="https://mealie.io/" target="_blank" rel="noopener noreferrer" className="underline hover:text-accent-text">
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
              test.reset();
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
              test.reset();
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
            disabled={test.status === "loading"}
            className="h-10 sm:h-8"
          >
            {test.status === "loading" ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : null}
            Test Connection
          </Button>
          {test.status === "success" && (
            <span className="flex items-center gap-1 text-xs text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {test.message}
            </span>
          )}
          {test.status === "error" && (
            <span className="flex items-center gap-1 text-xs text-destructive">
              <XCircle className="h-3.5 w-3.5" />
              {test.message}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

function UpdatesSection({ form, setForm }: FormProps) {
  const { data: status } = useUpdateStatus();
  const { phase, applyUpdate } = useApplyUpdate(status?.current);

  return (
    <section>
      <h2 className="text-lg font-semibold">Updates</h2>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Current</dt>
        <dd>{status?.current ?? "…"}</dd>
        <dt className="text-muted-foreground">Latest</dt>
        <dd>
          {status?.latest ? (
            <a
              href={`https://github.com/SachinVenugopalan30/sous-clip/releases/tag/${status.latest}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-accent-text"
            >
              {status.latest}
            </a>
          ) : (
            "Unknown"
          )}
          {status?.update_available && <span className="ml-2 text-accent-text">Update available</span>}
        </dd>
      </dl>
      {status?.update_available &&
        (status.watchtower ? (
          <div className="mt-4">
            <Button onClick={applyUpdate} disabled={phase === "updating"}>
              {phase === "updating" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {phase === "updating" ? "Updating…" : `Update to ${status.latest}`}
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">
              Restarts the app; extractions in progress resume afterwards. If this errors, check that
              WATCHTOWER_HTTP_API_TOKEN matches your .env.
            </p>
            {phase === "failed" && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                The update didn't apply within 5 minutes. Check <code>docker compose logs watchtower</code>.
              </p>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm">
            To update, run{" "}
            <code className="rounded bg-bg px-1.5 py-0.5 text-xs">docker compose pull && docker compose up -d</code>
          </p>
        ))}
      <label className="mt-4 flex min-h-11 items-center gap-3 text-sm sm:min-h-0">
        <input
          type="checkbox"
          className="size-5 accent-[var(--color-accent)]"
          checked={form.update_check !== "false"}
          onChange={(e) => setForm({ ...form, update_check: e.target.checked ? "true" : "false" })}
        />
        Check GitHub for new releases and stars (once an hour)
      </label>
    </section>
  );
}

function CustomEndpointFields({ form, setForm }: FormProps) {
  const test = useTestResult();
  const change = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
    test.reset();
  };

  const handleTest = async () => {
    if (!form.custom_base_url || !form.ai_model) {
      toast.error("Enter the endpoint URL and a model first");
      return;
    }
    test.set("loading");
    try {
      const result = await api.settings.testAI(form.custom_base_url, form.ai_model, form.custom_api_key || "");
      if (result.ok && result.style) {
        setForm({ ...form, custom_api_style: result.style });
        test.set("success", `Works: ${API_STYLE_LABELS[result.style]} API. Save to use it.`);
      } else {
        test.set("error", result.error || "Connection failed");
      }
    } catch (e) {
      test.set("error", e instanceof Error ? e.message : "Connection failed");
    }
  };

  return (
    <>
      <label className="block text-sm font-medium">
        Endpoint URL
        <Input
          value={form.custom_base_url || ""}
          onChange={(e) => change("custom_base_url", e.target.value)}
          placeholder="http://host.docker.internal:1234/v1"
          className="mt-1"
        />
      </label>
      <label className="block text-sm font-medium">
        API Key <span className="font-normal text-muted-foreground">(optional)</span>
        <Input
          type="password"
          value={form.custom_api_key || ""}
          onChange={(e) => change("custom_api_key", e.target.value)}
          placeholder="Leave blank if the endpoint needs no key"
          className="mt-1"
        />
      </label>
      <div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={handleTest} disabled={test.status === "loading"} className="h-10 sm:h-8">
            {test.status === "loading" && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Test connection
          </Button>
          {test.status === "idle" && form.custom_api_style && form.custom_base_url && (
            <span className="text-xs text-muted-foreground">Using the {API_STYLE_LABELS[form.custom_api_style]} API</span>
          )}
        </div>
        {(test.status === "success" || test.status === "error") && (
          <p
            role={test.status === "error" ? "alert" : "status"}
            className={`mt-2 flex items-start gap-1 text-xs ${test.status === "success" ? "text-success" : "text-destructive"}`}
          >
            {test.status === "success" ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
            {test.message}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Sends one small request to work out whether the endpoint speaks the OpenAI or Anthropic API. From Docker, use
          host.docker.internal instead of localhost.
        </p>
      </div>
    </>
  );
}
