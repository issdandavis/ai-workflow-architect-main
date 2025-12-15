// Provider adapters for multi-agent orchestration
// Returns safe stub responses when keys not configured

export interface ProviderResponse {
  success: boolean;
  content?: string;
  error?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    costEstimate: string;
  };
}

export interface ProviderAdapter {
  name: string;
  call(prompt: string, model: string): Promise<ProviderResponse>;
}

// Base adapter with fallback behavior
class BaseProviderAdapter implements ProviderAdapter {
  constructor(
    public name: string,
    protected apiKey: string | undefined,
  ) {}

  async call(prompt: string, model: string): Promise<ProviderResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: `${this.name} API key not configured. Please add the API key in Settings > API Keys.`,
      };
    }

    // Stub implementation - override in subclasses for real providers
    return {
      success: true,
      content: `[STUB] ${this.name} response to: ${prompt.substring(0, 50)}...`,
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        costEstimate: "0.0001",
      },
    };
  }
}

export class OpenAIAdapter extends BaseProviderAdapter {
  constructor(apiKey: string | undefined) {
    super("OpenAI", apiKey);
  }

  async call(prompt: string, model: string): Promise<ProviderResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: "OpenAI API key not configured. Please add the API key in Settings > API Keys.",
      };
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: model || "gpt-4o",
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || "OpenAI API error",
        };
      }

      const content = data.choices?.[0]?.message?.content || "";

      return {
        success: true,
        content,
        usage: {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
          costEstimate: "0.0003",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export class AnthropicAdapter extends BaseProviderAdapter {
  constructor(apiKey: string | undefined) {
    super("Anthropic", apiKey);
  }

  async call(prompt: string, model: string): Promise<ProviderResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: "Anthropic API key not configured. Please add the API key in Settings > API Keys.",
      };
    }

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: model || "claude-sonnet-4-20250514",
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || "Anthropic API error",
        };
      }

      const content = data.content?.[0]?.text || "";

      return {
        success: true,
        content,
        usage: {
          inputTokens: data.usage?.input_tokens || 0,
          outputTokens: data.usage?.output_tokens || 0,
          costEstimate: "0.0004",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export class XAIAdapter extends BaseProviderAdapter {
  constructor(apiKey: string | undefined) {
    super("xAI", apiKey);
  }

  async call(prompt: string, model: string): Promise<ProviderResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: "xAI API key not configured. Please add the API key in Settings > API Keys.",
      };
    }

    try {
      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: model || "grok-2",
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || "xAI API error",
        };
      }

      const content = data.choices?.[0]?.message?.content || "";

      return {
        success: true,
        content,
        usage: {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
          costEstimate: "0.0003",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export class PerplexityAdapter extends BaseProviderAdapter {
  constructor(apiKey: string | undefined) {
    super("Perplexity", apiKey);
  }

  async call(prompt: string, model: string): Promise<ProviderResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: "Perplexity API key not configured. Please add the API key in Settings > API Keys.",
      };
    }

    try {
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: model || "sonar",
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || "Perplexity API error",
        };
      }

      const content = data.choices?.[0]?.message?.content || "";

      return {
        success: true,
        content,
        usage: {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
          costEstimate: "0.0002",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export class GeminiAdapter extends BaseProviderAdapter {
  constructor(apiKey: string | undefined) {
    super("Google Gemini", apiKey);
  }

  async call(prompt: string, model: string): Promise<ProviderResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: "Google API key not configured. Please add the API key in Settings > API Keys.",
      };
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model || "gemini-2.0-flash"}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || "Gemini API error",
        };
      }

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      return {
        success: true,
        content,
        usage: {
          inputTokens: data.usageMetadata?.promptTokenCount || 0,
          outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
          costEstimate: "0.0001",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export class HuggingFaceAdapter extends BaseProviderAdapter {
  constructor() {
    super("HuggingFace", "free");
  }

  async call(prompt: string, model: string): Promise<ProviderResponse> {
    const { generateWithHuggingFace } = await import("./huggingfaceClient");
    return generateWithHuggingFace(prompt, model || "meta-llama/Meta-Llama-3-8B-Instruct");
  }
}

export class OllamaAdapter extends BaseProviderAdapter {
  constructor() {
    super("Ollama", "local");
  }

  async call(prompt: string, model: string): Promise<ProviderResponse> {
    const { generateWithOllama } = await import("./ollamaClient");
    return generateWithOllama(prompt, model || "llama3.1:8b");
  }
}

export class GroqAdapter extends BaseProviderAdapter {
  constructor(apiKey: string | undefined) {
    super("Groq", apiKey);
  }

  async call(prompt: string, model: string): Promise<ProviderResponse> {
    const { generateWithGroq } = await import("./groqClient");
    return generateWithGroq(prompt, model || "llama3-8b-8192");
  }
}

// Factory to get the right adapter
// If apiKey is provided, use it; otherwise fall back to process.env
export function getProviderAdapter(provider: string, apiKey?: string): ProviderAdapter {
  const envApiKeys = {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    xai: process.env.XAI_API_KEY,
    perplexity: process.env.PERPLEXITY_API_KEY,
    google: process.env.GOOGLE_API_KEY,
  };

  switch (provider.toLowerCase()) {
    case "openai":
      return new OpenAIAdapter(apiKey || envApiKeys.openai);
    case "anthropic":
      return new AnthropicAdapter(apiKey || envApiKeys.anthropic);
    case "xai":
      return new XAIAdapter(apiKey || envApiKeys.xai);
    case "perplexity":
      return new PerplexityAdapter(apiKey || envApiKeys.perplexity);
    case "google":
    case "gemini":
      return new GeminiAdapter(apiKey || envApiKeys.google);
    case "huggingface":
      return new HuggingFaceAdapter();
    case "ollama":
      return new OllamaAdapter();
    case "groq":
      return new GroqAdapter(apiKey || process.env.GROQ_API_KEY);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
