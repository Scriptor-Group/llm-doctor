/**
 * API Routes
 */

import { Router, Request, Response } from 'express';
import {
  CompletionRequest,
  ChatCompletionRequest,
  EmbeddingRequest
} from '../../types/index.js';
import { CompletionHandler, ChatCompletionHandler, EmbeddingHandler } from '../handlers/index.js';
import { FakeResponseGenerator } from '../../core/fake-data/fake-response-generator.js';
import { RequestLogger } from '../../core/stats/request-logger.js';
import { StatsManager } from '../../core/stats/stats-manager.js';

export function createAPIRoutes(
  completionHandler: CompletionHandler,
  chatCompletionHandler: ChatCompletionHandler,
  embeddingHandler: EmbeddingHandler,
  requestLogger: RequestLogger,
  statsManager: StatsManager
): Router {
  const router = Router();

  // List models
  router.get('/v1/models', async (req: Request, res: Response) => {
    statsManager.incrementStat('models');
    const response = FakeResponseGenerator.generateModels();
    res.json(response);
  });

  // Create completion
  router.post('/v1/completions', async (req: Request, res: Response) => {
    const completionReq = req.body as CompletionRequest;
    const requestId = (req as any).requestId;
    statsManager.incrementStat('completions');

    if (completionReq.stream) {
      // Stream response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Mark as streaming
      if (requestId) {
        requestLogger.logResponse(requestId, {
          content: '',
          streaming: true
        });
      }

      // Handle client abort
      req.on('close', () => {
        if (requestId) {
          requestLogger.markAsAborted(requestId);
        }
      });

      await completionHandler.handleStreamingCompletion(completionReq, res, {
        onChunk: (chunk) => {
          if (requestId) {
            requestLogger.updateStreamingContent(requestId, chunk);
          }
        },
        onComplete: (content, usage) => {
          if (requestId) {
            statsManager.addTokens(usage.prompt_tokens, usage.completion_tokens);
            requestLogger.logResponse(requestId, {
              content,
              finishReason: 'stop',
              model: completionReq.model,
              usage,
              streaming: false
            });
          }
        }
      });
    } else {
      // Regular response
      const response = await completionHandler.handleCompletion(completionReq);
      statsManager.addTokens(response.usage.prompt_tokens, response.usage.completion_tokens);

      // Log the response
      if (requestId) {
        requestLogger.logResponse(requestId, {
          content: response.choices[0]?.text || '',
          finishReason: response.choices[0]?.finish_reason || undefined,
          model: response.model,
          usage: response.usage,
          streaming: false
        });
      }

      res.json(response);
    }
  });

  // Create chat completion
  router.post('/v1/chat/completions', async (req: Request, res: Response) => {
    const chatReq = req.body as ChatCompletionRequest;
    const requestId = (req as any).requestId;
    statsManager.incrementStat('chat_completions');

    if (chatReq.stream) {
      // Stream response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Mark as streaming
      if (requestId) {
        requestLogger.logResponse(requestId, {
          content: '',
          streaming: true
        });
      }

      // Handle client abort
      req.on('close', () => {
        if (requestId) {
          requestLogger.markAsAborted(requestId);
        }
      });

      await chatCompletionHandler.handleStreamingChatCompletion(chatReq, res, {
        onChunk: (chunk) => {
          if (requestId) {
            requestLogger.updateStreamingContent(requestId, chunk);
          }
        },
        onComplete: (content, toolCalls, usage) => {
          if (requestId) {
            statsManager.addTokens(usage.prompt_tokens, usage.completion_tokens);
            requestLogger.logResponse(requestId, {
              content,
              toolCalls,
              finishReason: 'stop',
              model: chatReq.model,
              usage,
              streaming: false
            });
          }
        }
      });
    } else {
      // Regular response
      const response = await chatCompletionHandler.handleChatCompletion(chatReq);
      statsManager.addTokens(response.usage.prompt_tokens, response.usage.completion_tokens);

      // Log the response
      if (requestId) {
        requestLogger.logResponse(requestId, {
          content: response.choices[0]?.message?.content || '',
          finishReason: response.choices[0]?.finish_reason || undefined,
          model: response.model,
          usage: response.usage,
          streaming: false
        });
      }

      res.json(response);
    }
  });

  // Create embeddings
  router.post('/v1/embeddings', async (req: Request, res: Response) => {
    const embeddingReq = req.body as EmbeddingRequest;
    const requestId = (req as any).requestId;
    statsManager.incrementStat('embeddings');

    const response = await embeddingHandler.handleEmbedding(embeddingReq);
    statsManager.addTokens(response.usage.prompt_tokens, 0);

    // Log the response
    if (requestId) {
      requestLogger.logResponse(requestId, {
        content: `Embeddings generated: ${response.data.length} vectors`,
        model: response.model,
        usage: {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: 0,
          total_tokens: response.usage.total_tokens
        },
        streaming: false
      });
    }

    res.json(response);
  });

  // Health check
  router.get('/health', (req: Request, res: Response) => {
    const stats = statsManager.getStats();
    const uptime = Math.floor((Date.now() - stats.start_time) / 1000);
    res.json({
      status: 'healthy',
      uptime
    });
  });

  return router;
}
