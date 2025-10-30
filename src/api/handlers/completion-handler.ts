/**
 * Completion Request Handler
 */

import { Response } from 'express';
import { CompletionRequest } from '../../types/index.js';
import { FakeResponseGenerator } from '../../core/fake-data/fake-response-generator.js';
import { OpenAIClient } from '../../core/passthrough/openai-client.js';
import { PassthroughManager } from '../../core/passthrough/passthrough-manager.js';
import { ErrorSimulator } from '../../core/error-simulation/error-simulator.js';
import { TokenCounter, Helpers } from '../../utils/index.js';

export class CompletionHandler {
  constructor(
    private passthroughManager: PassthroughManager,
    private errorSimulator?: ErrorSimulator
  ) {}

  /**
   * Handle non-streaming completion
   */
  async handleCompletion(request: CompletionRequest) {
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
        return await client.createCompletion(request);
      } catch (error) {
        console.error('Passthrough error, falling back to fake mode:', error);
      }
    }

    return await FakeResponseGenerator.generateCompletion(
      request.prompt,
      request.model,
      request.n
    );
  }

  /**
   * Handle streaming completion
   */
  async handleStreamingCompletion(
    request: CompletionRequest,
    res: Response,
    callbacks?: {
      onChunk?: (chunk: string) => void;
      onComplete?: (content: string, usage: any) => void;
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
        // Note: OpenAI client doesn't support streaming completion callbacks like chat
        // For now, just proxy the stream
        await this.streamPassthroughCompletion(client, request, res, callbacks);
        return;
      } catch (error) {
        console.error('Passthrough streaming error, falling back to fake mode:', error);
      }
    }

    // Fake streaming mode
    await this.streamFakeCompletion(request, res, callbacks);
  }

  /**
   * Stream fake completion
   */
  private async streamFakeCompletion(
    request: CompletionRequest,
    res: Response,
    callbacks?: {
      onChunk?: (chunk: string) => void;
      onComplete?: (content: string, usage: any) => void;
    }
  ): Promise<void> {
    const model = request.model || 'fake-llama-3-8b';
    const fakeTokens = ['or', ' through', ' inaction', ' allow', ' a', ' human', ' being', ' to', ' come', ' to', ' harm', '.'];
    let fullContent = '';

    for (let i = 0; i < fakeTokens.length; i++) {
      if (res.writableEnded || !res.writable) break;

      fullContent += fakeTokens[i];
      const chunk = {
        id: `cmpl-${Math.random()}`,
        object: 'text_completion',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{
          index: 0,
          text: fakeTokens[i],
          logprobs: null,
          finish_reason: i < fakeTokens.length - 1 ? null : 'stop'
        }]
      };

      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      callbacks?.onChunk?.(fakeTokens[i]);
      await Helpers.sleep(50);
    }

    res.write('data: [DONE]\n\n');
    res.end();

    // Calculate usage
    const prompt = request.prompt;
    const promptTokens = typeof prompt === 'string' ? TokenCounter.count(prompt) : 10;
    const completionTokens = TokenCounter.count(fullContent);

    callbacks?.onComplete?.(fullContent, {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens
    });
  }

  /**
   * Stream passthrough completion
   */
  private async streamPassthroughCompletion(
    client: OpenAIClient,
    request: CompletionRequest,
    res: Response,
    callbacks?: {
      onChunk?: (chunk: string) => void;
      onComplete?: (content: string, usage: any) => void;
    }
  ): Promise<void> {
    // For now, just use non-streaming for passthrough completions
    const response = await client.createCompletion(request);

    // Simulate streaming by chunking the response
    const text = response.choices[0]?.text || '';
    const words = text.split(' ');

    for (let i = 0; i < words.length; i++) {
      const word = i === 0 ? words[i] : ' ' + words[i];
      const chunk = {
        id: response.id,
        object: 'text_completion',
        created: response.created,
        model: response.model,
        choices: [{
          index: 0,
          text: word,
          logprobs: null,
          finish_reason: i < words.length - 1 ? null : 'stop'
        }]
      };

      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      callbacks?.onChunk?.(word);
      await Helpers.sleep(50);
    }

    res.write('data: [DONE]\n\n');
    res.end();

    callbacks?.onComplete?.(text, response.usage);
  }
}
