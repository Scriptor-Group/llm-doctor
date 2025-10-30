/**
 * Embedding Request Handler
 */

import { EmbeddingRequest } from '../../types/index.js';
import { FakeResponseGenerator } from '../../core/fake-data/fake-response-generator.js';
import { OpenAIClient } from '../../core/passthrough/openai-client.js';
import { PassthroughManager } from '../../core/passthrough/passthrough-manager.js';
import { ErrorSimulator } from '../../core/error-simulation/error-simulator.js';

export class EmbeddingHandler {
  constructor(
    private passthroughManager: PassthroughManager,
    private errorSimulator?: ErrorSimulator
  ) {}

  /**
   * Handle embedding request
   */
  async handleEmbedding(request: EmbeddingRequest) {
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
        return await client.createEmbedding(request);
      } catch (error) {
        console.error('Passthrough embeddings error, falling back to fake mode:', error);
        // Fall through to fake mode
      }
    }

    return await FakeResponseGenerator.generateEmbeddings(
      request.input,
      request.model,
      request.dimensions
    );
  }
}
