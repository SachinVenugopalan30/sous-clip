export const AI_PROVIDERS = [
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "openai", label: "OpenAI" },
  { value: "ollama", label: "Ollama (Local)" },
  { value: "custom", label: "Custom endpoint" },
];
export const API_STYLE_LABELS: Record<string, string> = { openai: "OpenAI-compatible", anthropic: "Anthropic-compatible" };

export const WHISPER_MODELS = ["tiny", "base", "small", "medium", "large-v3"];
export const WHISPER_DEVICES = ["auto", "cpu", "cuda"];
export const WHISPER_COMPUTE = ["auto", "int8", "float16", "float32"];
