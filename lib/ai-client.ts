type AiProvider = "zhipu" | "deepseek" | "dashscope";

type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ModelUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

type JsonModelOptions = {
  messages: AiMessage[];
  temperature?: number;
  timeoutMs?: number;
};

type JsonModelResult = {
  content: string;
  model: string;
  provider: AiProvider;
  usage?: ModelUsage;
};

const providerDefaults: Record<AiProvider, { model: string; endpoint: string }> = {
  zhipu: {
    model: "glm-4.7-flash",
    endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
  },
  deepseek: {
    model: "deepseek-v4-flash",
    endpoint: "https://api.deepseek.com/chat/completions",
  },
  dashscope: {
    model: "qwen-flash",
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
  },
};

function configuredProvider(): AiProvider {
  const value = process.env.AI_PROVIDER?.toLowerCase();
  if (value === "zhipu" || value === "deepseek" || value === "dashscope") return value;
  if (process.env.ZHIPU_API_KEY) return "zhipu";
  if (process.env.DEEPSEEK_API_KEY) return "deepseek";
  return "dashscope";
}

function apiKeyFor(provider: AiProvider) {
  if (process.env.AI_API_KEY) return process.env.AI_API_KEY;
  if (provider === "zhipu") return process.env.ZHIPU_API_KEY;
  if (provider === "deepseek") return process.env.DEEPSEEK_API_KEY;
  return process.env.DASHSCOPE_API_KEY;
}

export function getAiConfiguration() {
  const provider = configuredProvider();
  const defaults = providerDefaults[provider];
  return {
    provider,
    apiKey: apiKeyFor(provider),
    model: process.env.AI_MODEL?.trim() || defaults.model,
    endpoint: process.env.AI_BASE_URL?.trim() || defaults.endpoint,
  };
}

export function isAiConfigured() {
  return Boolean(getAiConfiguration().apiKey);
}

export async function callJsonModel({ messages, temperature = 0.1, timeoutMs = 45_000 }: JsonModelOptions): Promise<JsonModelResult> {
  const configuration = getAiConfiguration();
  if (!configuration.apiKey) throw new Error("AI 服务尚未配置");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(configuration.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${configuration.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: configuration.model,
        temperature,
        response_format: { type: "json_object" },
        messages,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`模型服务返回 ${response.status}${detail ? `：${detail.slice(0, 160)}` : ""}`);
    }

    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: ModelUsage;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("模型没有返回内容");

    return {
      content,
      model: configuration.model,
      provider: configuration.provider,
      usage: payload.usage,
    };
  } finally {
    clearTimeout(timer);
  }
}

export function parseModelJson(content: string): unknown {
  const normalized = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(normalized);
}
