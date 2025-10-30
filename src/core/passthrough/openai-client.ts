/**
 * OpenAI Client - handles API calls to real OpenAI
 */

import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  CompletionRequest,
  CompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  PassthroughConfig
} from '../../types/index.js';
import { UUIDGenerator } from '../../utils/index.js';
import { Response } from 'express';

export class OpenAIClient {
  constructor(private config: PassthroughConfig) {}

  /**
   * Create chat completion
   */
  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const baseURL = this.config.baseURL || 'https://api.openai.com/v1';
    const model = this.config.model || request.model || 'gpt-3.5-turbo';

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        ...request,
        model,
        stream: false
      }),
      signal: AbortSignal.timeout(this.config.timeout || 60000)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data: any = await response.json();

    return {
      id: data.id || UUIDGenerator.generateWithPrefix('chatcmpl'),
      object: 'chat.completion',
      created: data.created || Math.floor(Date.now() / 1000),
      model: data.model || model,
      choices: data.choices,
      usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    };
  }

  /**
   * Stream chat completion
   */
  async streamChatCompletion(
    request: ChatCompletionRequest,
    res: Response,
    onChunk?: (chunk: string) => void,
    onComplete?: (content: string, toolCalls?: any[]) => void
  ): Promise<void> {
    const baseURL = this.config.baseURL || 'https://api.openai.com/v1';
    const model = this.config.model || request.model || 'gpt-3.5-turbo';

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        ...request,
        model,
        stream: true
      }),
      signal: AbortSignal.timeout(this.config.timeout || 60000)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullContent = '';
    const accumulatedToolCalls: Map<number, any> = new Map();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      res.write(chunk);

      // Parse SSE data
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.substring(6));
            const delta = data.choices?.[0]?.delta;

            if (delta?.content) {
              fullContent += delta.content;
              onChunk?.(delta.content);
            }

            // Accumulate tool calls
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                if (!accumulatedToolCalls.has(tc.index)) {
                  accumulatedToolCalls.set(tc.index, {
                    id: tc.id || '',
                    type: tc.type || 'function',
                    function: { name: tc.function?.name || '', arguments: tc.function?.arguments || '' }
                  });
                } else {
                  const existing = accumulatedToolCalls.get(tc.index);
                  if (tc.id) existing.id = tc.id;
                  if (tc.function?.name) existing.function.name += tc.function.name;
                  if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
                }
              }
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }

    res.end();

    const toolCallsArray = Array.from(accumulatedToolCalls.values());
    onComplete?.(fullContent, toolCallsArray.length > 0 ? toolCallsArray : undefined);
  }

  /**
   * Create completion
   */
  async createCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    const baseURL = this.config.baseURL || 'https://api.openai.com/v1';
    const model = this.config.model || request.model || 'gpt-3.5-turbo-instruct';

    const response = await fetch(`${baseURL}/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({ ...request, model, stream: false }),
      signal: AbortSignal.timeout(this.config.timeout || 60000)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data: any = await response.json();

    return {
      id: data.id || UUIDGenerator.generateWithPrefix('cmpl'),
      object: 'text_completion',
      created: data.created || Math.floor(Date.now() / 1000),
      model: data.model || model,
      choices: data.choices,
      usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    };
  }

  /**
   * Create embeddings
   */
  async createEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const baseURL = this.config.baseURL || 'https://api.openai.com/v1';
    const model = this.config.model || request.model || 'text-embedding-3-small';

    const response = await fetch(`${baseURL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({ ...request, model }),
      signal: AbortSignal.timeout(this.config.timeout || 60000)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data: any = await response.json();

    return {
      id: data.id || UUIDGenerator.generateWithPrefix('embd'),
      object: 'list',
      created: data.created || Math.floor(Date.now() / 1000),
      model: data.model || model,
      data: data.data,
      usage: data.usage
    };
  }
}
