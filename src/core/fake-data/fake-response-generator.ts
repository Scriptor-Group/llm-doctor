/**
 * Fake Response Generator - generates realistic fake responses
 */

import {
  ChatMessage,
  ChatCompletionResponse,
  CompletionResponse,
  EmbeddingResponse,
  Tool,
  ModelsResponse
} from '../../types/index.js';
import { UUIDGenerator, TokenCounter, Helpers } from '../../utils/index.js';

export class FakeResponseGenerator {
  /**
   * Generate fake models response
   */
  static generateModels(): ModelsResponse {
    return {
      object: 'list',
      data: [
        {
          id: 'fake-llama-3-8b',
          object: 'model',
          created: Math.floor(Date.now() / 1000),
          owned_by: 'fake-vllm',
          root: 'fake-llama-3-8b',
          parent: null,
          max_model_len: 8192,
          permission: []
        },
        {
          id: 'fake-mistral-7b',
          object: 'model',
          created: Math.floor(Date.now() / 1000),
          owned_by: 'fake-vllm',
          root: 'fake-mistral-7b',
          parent: null,
          max_model_len: 32768,
          permission: []
        },
        {
          id: 'fake-e5-embeddings',
          object: 'model',
          created: Math.floor(Date.now() / 1000),
          owned_by: 'fake-vllm',
          root: 'fake-e5-embeddings',
          parent: null,
          max_model_len: 512,
          permission: []
        }
      ]
    };
  }

  /**
   * Generate fake completion response
   */
  static async generateCompletion(
    prompt: string | string[] | number[] | number[][] | undefined,
    model: string = 'fake-llama-3-8b',
    n: number = 1
  ): Promise<CompletionResponse> {
    await Helpers.sleep(100);

    const fakeText = ' or through inaction allow a human being to come to harm.';
    const choices = Array.from({ length: n }, (_, i) => ({
      index: i,
      text: fakeText,
      logprobs: null,
      finish_reason: 'stop' as const,
      stop_reason: null
    }));

    const promptTokens = typeof prompt === 'string' ? TokenCounter.count(prompt) : 10;
    const completionTokens = TokenCounter.count(fakeText);

    return {
      id: UUIDGenerator.generateWithPrefix('cmpl'),
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices,
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens
      }
    };
  }

  /**
   * Generate fake chat completion response
   */
  static async generateChatCompletion(
    messages: ChatMessage[],
    model: string = 'fake-llama-3-8b',
    tools?: Tool[],
    n: number = 1
  ): Promise<ChatCompletionResponse> {
    await Helpers.sleep(100);

    const fakeContent = this.generateIntelligentResponse(messages, tools);
    const choices = Array.from({ length: n }, (_, i) => ({
      index: i,
      message: {
        role: 'assistant' as const,
        content: fakeContent
      },
      logprobs: null,
      finish_reason: 'stop' as const
    }));

    const promptTokens = messages.reduce((sum, msg) => sum + TokenCounter.count(msg.content), 0);
    const completionTokens = TokenCounter.count(fakeContent);

    return {
      id: UUIDGenerator.generateWithPrefix('chatcmpl'),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices,
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens
      }
    };
  }

  /**
   * Generate fake embeddings
   */
  static async generateEmbeddings(
    input: string | string[] | number[] | number[][],
    model: string = 'fake-e5-embeddings',
    dimensions: number = 768
  ): Promise<EmbeddingResponse> {
    await Helpers.sleep(100);

    const inputs = Array.isArray(input) ? input : [input];
    const data = inputs.map((_, idx) => ({
      index: idx,
      object: 'embedding',
      embedding: Helpers.generateNormalizedEmbedding(dimensions)
    }));

    const totalTokens = inputs.reduce((sum: number, inp) => {
      return sum + TokenCounter.countInput(inp);
    }, 0);

    return {
      id: UUIDGenerator.generateWithPrefix('embd'),
      object: 'list',
      created: Math.floor(Date.now() / 1000),
      model,
      data,
      usage: {
        prompt_tokens: totalTokens,
        total_tokens: totalTokens
      }
    };
  }

  /**
   * Generate intelligent response based on context
   */
  private static generateIntelligentResponse(messages: ChatMessage[], tools?: Tool[]): string {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return 'Hello! How can I help you today?';

    const content = lastMessage.content.toLowerCase();

    // Context-aware responses
    if (content.includes('weather')) {
      return 'Based on the current data, the weather is sunny with a temperature of 22°C.';
    }
    if (content.includes('hello') || content.includes('hi')) {
      return 'Hello! How can I assist you today?';
    }
    if (content.includes('help')) {
      return 'I\'m here to help! What would you like to know?';
    }
    if (tools && tools.length > 0) {
      return `I can help you with that using available tools: ${tools.map(t => t.function.name).join(', ')}.`;
    }

    return 'This is a fake response generated by the vLLM fake server for testing purposes.';
  }
}
