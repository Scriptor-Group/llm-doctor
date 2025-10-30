/**
 * Chat Completion Request Handler
 */

import { Response } from 'express';
import { ChatCompletionRequest } from '../../types/index.js';
import { FakeResponseGenerator } from '../../core/fake-data/fake-response-generator.js';
import { OpenAIClient } from '../../core/passthrough/openai-client.js';
import { PassthroughManager } from '../../core/passthrough/passthrough-manager.js';
import { ErrorSimulator } from '../../core/error-simulation/error-simulator.js';
import { TokenCounter, Helpers, UUIDGenerator } from '../../utils/index.js';

export class ChatCompletionHandler {
  constructor(
    private passthroughManager: PassthroughManager,
    private errorSimulator?: ErrorSimulator
  ) {}

  /**
   * Handle non-streaming chat completion
   */
  async handleChatCompletion(request: ChatCompletionRequest) {
    // Check for error simulation
    if (this.errorSimulator?.isEnabled()) {
      const errorResponse = this.errorSimulator.getErrorResponse();
      if (errorResponse) {
        throw {
          status: errorResponse.status,
          data: errorResponse.body
        };
      }
    }

    if (this.passthroughManager.isEnabled()) {
      try {
        const client = new OpenAIClient(this.passthroughManager.getConfig());
        return await client.createChatCompletion(request);
      } catch (error) {
        console.error('Passthrough error, falling back to fake mode:', error);
      }
    }

    return await FakeResponseGenerator.generateChatCompletion(
      request.messages,
      request.model,
      request.tools,
      request.n
    );
  }

  /**
   * Handle streaming chat completion
   */
  async handleStreamingChatCompletion(
    request: ChatCompletionRequest,
    res: Response,
    callbacks?: {
      onChunk?: (chunk: string) => void;
      onComplete?: (content: string, toolCalls: any[] | undefined, usage: any) => void;
    }
  ): Promise<void> {
    // Check for error simulation
    if (this.errorSimulator?.isEnabled()) {
      const errorResponse = this.errorSimulator.getErrorResponse();
      if (errorResponse) {
        res.status(errorResponse.status).json(errorResponse.body);
        return;
      }
    }

    // Passthrough mode
    if (this.passthroughManager.isEnabled()) {
      try {
        const client = new OpenAIClient(this.passthroughManager.getConfig());
        await client.streamChatCompletion(
          request,
          res,
          callbacks?.onChunk,
          (content, toolCalls) => {
            const messages = request.messages || [];
            const promptTokens = messages.reduce((sum, msg) => sum + TokenCounter.count(msg.content), 0);
            const completionTokens = TokenCounter.count(content);

            callbacks?.onComplete?.(content, toolCalls, {
              prompt_tokens: promptTokens,
              completion_tokens: completionTokens,
              total_tokens: promptTokens + completionTokens
            });
          }
        );
        return;
      } catch (error) {
        console.error('Passthrough streaming error, falling back to fake mode:', error);
      }
    }

    // Fake streaming mode
    await this.streamFakeChatCompletion(request, res, callbacks);
  }

  /**
   * Stream fake chat completion
   */
  private async streamFakeChatCompletion(
    request: ChatCompletionRequest,
    res: Response,
    callbacks?: {
      onChunk?: (chunk: string) => void;
      onComplete?: (content: string, toolCalls: any[] | undefined, usage: any) => void;
    }
  ): Promise<void> {
    const model = request.model || 'fake-llama-3-8b';
    const fakeTokens = ['This', ' is', ' a', ' fake', ' streaming', ' chat', ' completion', ' response', '.'];
    let fullContent = '';

    for (let i = 0; i < fakeTokens.length; i++) {
      if (res.writableEnded || !res.writable) break;

      fullContent += fakeTokens[i];
      callbacks?.onChunk?.(fakeTokens[i]);

      const chunk = {
        id: UUIDGenerator.generateWithPrefix('chatcmpl'),
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{
          index: 0,
          delta: i === 0 ? { role: 'assistant', content: fakeTokens[i] } : { content: fakeTokens[i] },
          logprobs: null,
          finish_reason: i < fakeTokens.length - 1 ? null : 'stop'
        }]
      };

      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      await Helpers.sleep(50);
    }

    res.write('data: [DONE]\n\n');
    res.end();

    // Calculate usage
    const messages = request.messages || [];
    const promptTokens = messages.reduce((sum, msg) => sum + TokenCounter.count(msg.content), 0);
    const completionTokens = TokenCounter.count(fullContent);

    callbacks?.onComplete?.(fullContent, undefined, {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens
    });
  }
}
