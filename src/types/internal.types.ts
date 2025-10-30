/**
 * Internal Application Types
 */

import { ToolCall, TokenUsage } from './api.types.js';

export interface RequestLog {
  timestamp: string;
  endpoint: string;
  method: string;
  body: Record<string, unknown>;
  headers: Record<string, string | string[] | undefined>;
  response?: ResponseData;
  streamingContent?: string;
  executionTime?: number;
  tokens?: number;
  tokensIn?: number;
  tokensOut?: number;
  aborted?: boolean;
}

export interface ResponseData {
  content: string;
  toolCalls?: ToolCall[];
  finishReason?: string;
  model?: string;
  usage?: TokenUsage;
  streaming?: boolean;
}

export interface Stats {
  total_requests: number;
  completions: number;
  chat_completions: number;
  embeddings: number;
  models: number;
  errors: number;
  start_time: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  avg_response_time: number;
  requests_per_minute: number;
}

export type StatType = 'completions' | 'chat_completions' | 'embeddings' | 'models' | 'errors';

export interface PassthroughConfig {
  enabled: boolean;
  apiKey?: string;
  baseURL?: string;
  model?: string;
  timeout?: number;
}
