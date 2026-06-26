const BASE = "/api";

export interface RequestSummary {
  id: number;
  timestamp: string;
  model: string;
  elapsed_ms: number;
  status: number;
  usage: {
    input_tokens?: string;
    output_tokens?: string;
  };
  context_chars: number;
  message_count: number;
  tool_count: number;
  request_type: "main" | "tool_call" | "recap";
  preview: string;
  session_id: string;
}

export interface RequestDetail {
  id: number;
  timestamp: string;
  model: string;
  elapsed_ms: number;
  status: number;
  usage: {
    input_tokens?: string;
    output_tokens?: string;
  };
  request: {
    headers: Record<string, string>;
    body: Record<string, unknown>;
  };
  response: {
    headers: Record<string, string>;
    body: unknown;
    status: number;
  };
}

export interface ContextSection {
  type: string;
  label: string;
  chars: number;
  content: string;
  is_fixed?: boolean;
  role?: string;
  tool_names?: string[];
}

export interface ContextBreakdown {
  claude_md: { path: string; content: string; chars: number } | null;
  rules: { path: string; content: string; chars: number }[];
  memory: { path: string; content: string; chars: number } | null;
  skills: string[];
  tool_names: string[];
  tool_calls: { name: string; tool_use_id: string; input_preview: string }[];
  tool_results: { tool_use_id: string; preview: string }[];
  thinking_count: number;
  response_text: string;
  history_turns: number;
  model_params: Record<string, unknown>;
}

export interface ContextResponse {
  sections: ContextSection[];
  total_chars: number;
  total_tokens_estimate: number;
  breakdown: ContextBreakdown;
}

export interface RequestsResponse {
  total: number;
  offset: number;
  limit: number;
  requests: RequestSummary[];
}

export async function fetchRequests(limit = 100): Promise<RequestsResponse> {
  const res = await fetch(`${BASE}/requests?limit=${limit}`);
  return res.json();
}

export async function fetchRequestDetail(id: number): Promise<RequestDetail> {
  const res = await fetch(`${BASE}/requests/${id}`);
  return res.json();
}

export async function fetchRequestContext(id: number): Promise<ContextResponse> {
  const res = await fetch(`${BASE}/requests/${id}/context`);
  return res.json();
}
