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
  model?: string;
  maxTokens?: number;
  thinking?: boolean;
  reasoningEffort?: "low" | "high" | "max";
  jsonMode?: boolean;
};

type JsonModelResult = {
  content: string;
  model: string;
  provider: AiProvider;
  usage?: ModelUsage;
  finishReason?: string | null;
};

const providerDefaults: Record<AiProvider, { model: string; endpoint: string }> = {
  zhipu: {
    model: "glm-4.5-flash",
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
  if (provider === "zhipu" && process.env.ZHIPU_API_KEY) return process.env.ZHIPU_API_KEY;
  if (provider === "deepseek" && process.env.DEEPSEEK_API_KEY) return process.env.DEEPSEEK_API_KEY;
  if (provider === "dashscope" && process.env.DASHSCOPE_API_KEY) return process.env.DASHSCOPE_API_KEY;
  return process.env.AI_API_KEY;
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

async function callModel({ messages, temperature = 0.1, timeoutMs = 45_000, model, maxTokens = 6_000, thinking = false, reasoningEffort = "high", jsonMode = true }: JsonModelOptions): Promise<JsonModelResult> {
  const configuration = getAiConfiguration();
  if (!configuration.apiKey) throw new Error("AI 服务尚未配置");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      response = await fetch(configuration.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${configuration.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: model || configuration.model,
          temperature: configuration.provider === "zhipu" && temperature === 0 ? 0.01 : temperature,
          max_tokens: maxTokens,
          ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
          messages,
          ...(configuration.provider === "deepseek" ? {
            thinking: { type: thinking ? "enabled" : "disabled" },
            reasoning_effort: reasoningEffort,
          } : {}),
        }),
      });
      if (response.ok || response.status !== 429 || attempt === 2) break;
      await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
    }

    if (!response?.ok) {
      const detail = await response?.text().catch(() => "");
      if (response?.status === 429) throw new Error("模型当前访问量较大，请稍后重新分析");
      throw new Error(`模型服务返回 ${response?.status ?? "未知错误"}${detail ? `：${detail.slice(0, 160)}` : ""}`);
    }

    const payload = await response.json() as {
      choices?: Array<{ finish_reason?: string | null; message?: { content?: string | null; reasoning_content?: string | null } }>;
      usage?: ModelUsage;
    };
    const content = payload.choices?.[0]?.message?.content;
    const finishReason = payload.choices?.[0]?.finish_reason ?? null;
    if (!content?.trim()) {
      const suffix = finishReason ? `（结束原因：${finishReason}）` : "";
      throw new Error(`模型没有返回最终内容${suffix}`);
    }

    return {
      content,
      model: model || configuration.model,
      provider: configuration.provider,
      usage: payload.usage,
      finishReason,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function callJsonModel(options: JsonModelOptions) {
  return callModel({ ...options, jsonMode: options.jsonMode ?? true });
}

export async function callTextModel(options: JsonModelOptions) {
  return callModel({ ...options, jsonMode: false });
}

export function parseModelJson(content: string): unknown {
  const normalized = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(normalized);
}
