import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Save, CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Field, Input, Select } from "../components/ui/input";
import { useApplyUpdate } from "../hooks/useApplyUpdate";
import { useTestResult } from "../hooks/useTestResult";
import { AI_PROVIDERS, API_STYLE_LABELS, WHISPER_COMPUTE, WHISPER_DEVICES, WHISPER_MODELS } from "../lib/settingsOptions";
import { useSettings, useUpdateSettings, useUpdateStatus } from "../hooks/useSettings";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

type FormProps = {
  form: Record<string, string>;
  setForm: (patch: Record<string, string>) => void;
};

const URL_ERROR = "Enter a full address starting with http:// or https://";
const badUrl = (v?: string) => (v && !/^https?:\/\/\S+$/i.test(v) ? URL_ERROR : undefined);

function SettingsPage() {
  const { data: settings, isLoading, isError, refetch } = useSettings();
  const update = useUpdateSettings();
  // Unsaved changes layered over the server settings; cleared once a save has refetched them
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const form = { ...settings, ...edits };
  const setForm = (patch: Record<string, string>) => setEdits((p) => ({ ...p, ...patch }));
  // Only edited URL fields in play are checked (an old stored value never blocks an unrelated save); errors show once Save has been pressed
  const urlKeys = ["mealie_url", ...(form.ai_provider === "ollama" ? ["ollama_base_url"] : []), ...(form.ai_provider === "custom" ? ["custom_base_url"] : [])];
  const found: Record<string, string | undefined> = {};
  for (const k of urlKeys) if (k in edits) found[k] = badUrl(edits[k].trim());
  const bad = Object.values(found).some(Boolean);
  const errors = checked ? found : {};

  const handleSave = () => {
    setChecked(true);
    if (bad) {
      toast.error("Fix the highlighted fields first");
      return;
    }
    // Edited URL fields go out trimmed
    const body = { ...form };
    for (const k of ["mealie_url", "ollama_base_url", "custom_base_url"]) if (k in edits) body[k] = edits[k].trim();
    update.mutate(body, {
      onSuccess: () => {
        setEdits({});
        setChecked(false);
        toast.success("Settings saved");
      },
      onError: () => toast.error("Failed to save settings"),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <h1 className="sr-only">Loading settings</h1>
        <div className="sk h-12 w-64" />
        <div className="sk h-64 w-full" />
      </div>
    );
  }

  // No stored values to edit over: showing the form would let Save overwrite them with blanks
  if (isError && !settings) {
    return (
      <div className="none" role="alert">
        <h1 className="sr-only">Settings</h1>
        <h2>Can't reach <em>the kitchen</em></h2>
        <p>The server isn't answering, so the house rules can't load. Check your connection, or that Sous Clip is running.</p>
        <button type="button" onClick={() => refetch()} className="none-btn press">Try again</button>
      </div>
    );
  }

  const dirty = Object.keys(edits).length > 0;
  const card = (i: number) => ({ className: "set-card in", style: { "--i": i } as React.CSSProperties });

  return (
    <div className="display">
      <h1 className="in set-h1">
        House <em>rules</em>
        <span className="sr-only"> (settings)</span>
      </h1>

      <div className="set-grid">
        <section {...card(1)}>
          <h2>AI provider</h2>
          <Field label="Provider">
            <Select value={form.ai_provider || ""} onChange={(e) => setForm({ ai_provider: e.target.value })}>
              {AI_PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Model">
            <Input value={form.ai_model || ""} onChange={(e) => setForm({ ai_model: e.target.value })} placeholder="e.g. claude-sonnet-4-6, gpt-4o" />
          </Field>

          {form.ai_provider === "anthropic" && (
            <Field label="Anthropic API key">
              <Input type="password" autoComplete="off" value={form.anthropic_api_key || ""} onChange={(e) => setForm({ anthropic_api_key: e.target.value })} placeholder="sk-ant-..." />
            </Field>
          )}
          {form.ai_provider === "openai" && (
            <Field label="OpenAI API key">
              <Input type="password" autoComplete="off" value={form.openai_api_key || ""} onChange={(e) => setForm({ openai_api_key: e.target.value })} placeholder="sk-..." />
            </Field>
          )}
          {form.ai_provider === "ollama" && (
            <Field label="Ollama base URL" error={errors.ollama_base_url}>
              <Input value={form.ollama_base_url || ""} onChange={(e) => setForm({ ollama_base_url: e.target.value })} placeholder="http://localhost:11434" />
            </Field>
          )}
          {form.ai_provider === "custom" && <CustomEndpointFields form={form} setForm={setForm} errors={errors} />}
        </section>

        <section {...card(2)}>
          <h2>Whisper transcription</h2>
          <Field label="Model size" hint='Larger models are more accurate but slower. "base" is a good default.'>
            <Select value={form.whisper_model_size || "base"} onChange={(e) => setForm({ whisper_model_size: e.target.value })}>
              {WHISPER_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
          </Field>
          <Field label="Device" hint='"auto" detects GPU and falls back to CPU.'>
            <Select value={form.whisper_device || "auto"} onChange={(e) => setForm({ whisper_device: e.target.value })}>
              {WHISPER_DEVICES.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </Field>
          <Field label="Compute type" hint='"int8" for CPU speed, "float16" for GPU speed.'>
            <Select value={form.whisper_compute_type || "auto"} onChange={(e) => setForm({ whisper_compute_type: e.target.value })}>
              {WHISPER_COMPUTE.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </section>

        <MealieSection form={form} setForm={setForm} errors={errors} card={card(3)} />
        <UpdatesSection form={form} setForm={setForm} card={card(4)} />
      </div>

      <div className="set-bar">
        <Button onClick={handleSave} disabled={update.isPending}>
          {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save settings
        </Button>
        {update.isError && <p role="alert" className="msg bad !mt-0"><XCircle className="h-4 w-4 shrink-0" />Failed to save settings</p>}
        {update.isSuccess && !dirty && <p role="status" className="msg ok !mt-0"><CheckCircle2 className="h-4 w-4 shrink-0" />Settings saved</p>}
        {Object.values(errors).some(Boolean) && <p role="alert" className="msg bad !mt-0"><XCircle className="h-4 w-4 shrink-0" />Fix the highlighted fields</p>}
      </div>
    </div>
  );
}

type Errors = Record<string, string | undefined>;
type Card = { className: string; style: React.CSSProperties };

function TestMsg({ test }: { test: ReturnType<typeof useTestResult> }) {
  if (test.status !== "success" && test.status !== "error") return null;
  const ok = test.status === "success";
  return (
    <p role={ok ? "status" : "alert"} className={`msg ${ok ? "ok" : "bad"}`}>
      {ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
      {test.message}
    </p>
  );
}

function MealieSection({ form, setForm, errors, card }: FormProps & { errors: Errors; card: Card }) {
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
    <section {...card}>
      <h2>Mealie</h2>
      <p className="hint mb-4">
        Optionally forward extracted recipes to a{" "}
        <a href="https://mealie.io/" target="_blank" rel="noopener noreferrer" className="underline hover:text-accent-text">
          Mealie
        </a>{" "}
        instance. Leave blank to skip.
      </p>
      <Field label="Mealie URL" error={errors.mealie_url}>
        <Input
          value={form.mealie_url || ""}
          onChange={(e) => {
            setForm({ mealie_url: e.target.value });
            test.reset();
          }}
          placeholder="https://mealie.example.com"
        />
      </Field>
      <Field label="Mealie API key" hint="Generate a token in Mealie at User Profile → API Tokens.">
        <Input
          type="password"
          autoComplete="off"
          value={form.mealie_api_key || ""}
          onChange={(e) => {
            setForm({ mealie_api_key: e.target.value });
            test.reset();
          }}
          placeholder="Your Mealie API token"
        />
      </Field>
      <Button variant="outline" size="sm" onClick={handleTest} disabled={test.status === "loading"}>
        {test.status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
        Test connection
      </Button>
      <TestMsg test={test} />
    </section>
  );
}

function UpdatesSection({ form, setForm, card }: FormProps & { card: Card }) {
  const { data: status } = useUpdateStatus();
  const { phase, applyUpdate } = useApplyUpdate(status?.current);

  return (
    <section {...card}>
      <h2>Updates</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Current</dt>
        <dd className="mono !text-foreground">{status?.current ?? "…"}</dd>
        <dt className="text-muted-foreground">Latest</dt>
        <dd className="mono !text-foreground">
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
        </dd>
      </dl>
      {status?.update_available && (
        <div className="set-up" role="status">
          <p className="font-medium">Update available{status.latest && `: ${status.latest}`}</p>
          {status.watchtower ? (
            <>
              <Button onClick={applyUpdate} disabled={phase === "updating"} className="mt-3">
                {phase === "updating" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {phase === "updating" ? "Updating…" : `Update to ${status.latest}`}
              </Button>
              <p className="hint mt-2">
                Restarts the app; extractions in progress resume afterwards. If this errors, check that
                WATCHTOWER_HTTP_API_TOKEN matches your .env.
              </p>
              {phase === "failed" && (
                <p role="alert" className="msg bad">
                  The update didn't apply within 5 minutes. Check <code>docker compose logs watchtower</code>.
                </p>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm">
              To update, run <code>docker compose pull && docker compose up -d</code>
            </p>
          )}
        </div>
      )}
      <label className="mt-4 flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="size-5 shrink-0 accent-[var(--color-accent)]"
          checked={form.update_check !== "false"}
          onChange={(e) => setForm({ update_check: e.target.checked ? "true" : "false" })}
        />
        Check GitHub for new releases and stars (once an hour)
      </label>
    </section>
  );
}

function CustomEndpointFields({ form, setForm, errors }: FormProps & { errors: Errors }) {
  const test = useTestResult();
  const change = (key: string, value: string) => {
    setForm({ [key]: value });
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
        setForm({ custom_api_style: result.style });
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
      <Field label="Endpoint URL" error={errors.custom_base_url}>
        <Input value={form.custom_base_url || ""} onChange={(e) => change("custom_base_url", e.target.value)} placeholder="http://host.docker.internal:1234/v1" />
      </Field>
      <Field label={<>API key <span className="font-normal text-muted-foreground">(optional)</span></>}>
        <Input type="password" autoComplete="off" value={form.custom_api_key || ""} onChange={(e) => change("custom_api_key", e.target.value)} placeholder="Leave blank if the endpoint needs no key" />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={handleTest} disabled={test.status === "loading"}>
          {test.status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
          Test connection
        </Button>
        {test.status === "idle" && form.custom_api_style && form.custom_base_url && (
          <span className="hint">Using the {API_STYLE_LABELS[form.custom_api_style]} API</span>
        )}
      </div>
      <TestMsg test={test} />
      <p className="hint mt-2 mb-4">
        Sends one small request to work out whether the endpoint speaks the OpenAI or Anthropic API. From Docker, use
        host.docker.internal instead of localhost.
      </p>
    </>
  );
}
