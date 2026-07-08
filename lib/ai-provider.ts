import Anthropic from "@anthropic-ai/sdk";

/**
 * Single entry point for all AI calls in GovContract AI.
 *
 * Swapping providers is one env var: AI_PROVIDER=anthropic|deepseek
 *
 * IMPORTANT TRADEOFF (read before flipping to deepseek):
 * DeepSeek's Anthropic-compatible endpoint (api.deepseek.com/anthropic)
 * accepts the Anthropic SDK shape, but it does not support:
 *   - mcp_servers (server-side MCP tool orchestration)
 *   - image / document content blocks
 * Your proposal's MCP workflows (section 4) rely on mcp_servers so Claude
 * can read Gmail/Outlook, Calendar, and Drive within a single request.
 * If AI_PROVIDER=deepseek, mcpServers on callAI() is ignored and a warning
 * is logged. Use deepseek only for pure drafting / fit-scoring calls that
 * don't need MCP, and keep MCP-driven workflows on anthropic.
 */

type MCPServerConfig = {
  type: "url";
  url: string;
  name: string;
};

type CallAIParams = {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
  mcpServers?: MCPServerConfig[];
};

const PROVIDER = process.env.AI_PROVIDER ?? "anthropic";

function getClient() {
  if (PROVIDER === "deepseek") {
    return new Anthropic({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/anthropic",
    });
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function modelFor(provider: string) {
  // DeepSeek maps claude-sonnet-* -> deepseek-v4-flash, claude-opus-* -> deepseek-v4-pro
  return provider === "deepseek" ? "claude-sonnet-4-6" : "claude-sonnet-4-6";
}

export async function callAI({ system, messages, maxTokens = 2000, mcpServers }: CallAIParams) {
  if (PROVIDER === "deepseek" && mcpServers?.length) {
    console.warn(
      "[ai-provider] mcpServers requested but AI_PROVIDER=deepseek does not support " +
        "MCP tool orchestration. Ignoring mcpServers for this call. " +
        "Route MCP-dependent workflows through AI_PROVIDER=anthropic instead."
    );
  }

  const client = getClient();
  const useMcp = PROVIDER === "anthropic" && mcpServers?.length;

  const response = await client.messages.create({
    model: modelFor(PROVIDER),
    max_tokens: maxTokens,
    system,
    messages,
    ...(useMcp ? { mcp_servers: mcpServers } : {}),
  });

  return response;
}

/**
 * Streaming counterpart to callAI(), for the drafting workspace (§5.3 —
 * "Claude's output streams token-by-token into the drafting editor").
 * Returns the Anthropic SDK's MessageStream; consume via
 * `stream.on("text", (delta) => ...)` and `stream.on("end", ...)`.
 */
export function streamAI({ system, messages, maxTokens = 2000, mcpServers }: CallAIParams) {
  if (PROVIDER === "deepseek" && mcpServers?.length) {
    console.warn(
      "[ai-provider] mcpServers requested but AI_PROVIDER=deepseek does not support " +
        "MCP tool orchestration. Ignoring mcpServers for this call. " +
        "Route MCP-dependent workflows through AI_PROVIDER=anthropic instead."
    );
  }

  const client = getClient();
  const useMcp = PROVIDER === "anthropic" && mcpServers?.length;

  return client.messages.stream({
    model: modelFor(PROVIDER),
    max_tokens: maxTokens,
    system,
    messages,
    ...(useMcp ? { mcp_servers: mcpServers } : {}),
  });
}
