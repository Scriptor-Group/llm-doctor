/**
 * API Request/Response Types
 */

export interface CompletionRequest {
  model?: string;
  prompt?: string | string[] | number[] | number[][];
  best_of?: number;
  echo?: boolean;
  frequency_penalty?: number;
  logit_bias?: Record<string, number>;
  logprobs?: number;
  max_tokens?: number;
  n?: number;
  presence_penalty?: number;
  seed?: number;
  stop?: string | string[];
  stream?: boolean;
  suffix?: string;
  temperature?: number;
  top_p?: number;
  user?: string;
  top_k?: number;
  min_p?: number;
  repetition_penalty?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ChatCompletionRequest {
  model?: string;
  messages: ChatMessage[];
  frequency_penalty?: number;
  logit_bias?: Record<string, number>;
  logprobs?: boolean;
  top_logprobs?: number;
  max_tokens?: number;
  n?: number;
  presence_penalty?: number;
  seed?: number;
  stop?: string | string[];
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  user?: string;
  top_k?: number;
  min_p?: number;
  repetition_penalty?: number;
  tools?: Tool[];
  tool_choice?: unknown;
}

export interface EmbeddingRequest {
  model?: string;
  input: string | string[] | number[] | number[][];
  encoding_format?: string;
  dimensions?: number;
  user?: string;
  truncate_prompt_tokens?: number;
  add_special_tokens?: boolean;
}

export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface Tool {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface CompletionChoice {
  index: number;
  text: string;
  logprobs: null;
  finish_reason: string | null;
  stop_reason?: null;
}

export interface CompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: CompletionChoice[];
  usage: TokenUsage;
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  logprobs: null;
  finish_reason: string | null;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: TokenUsage;
}

export interface EmbeddingData {
  index: number;
  object: string;
  embedding: number[];
}

export interface EmbeddingResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  data: EmbeddingData[];
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface ModelData {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  root: string;
  parent: null;
  max_model_len: number;
  permission: unknown[];
}

export interface ModelsResponse {
  object: string;
  data: ModelData[];
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}
