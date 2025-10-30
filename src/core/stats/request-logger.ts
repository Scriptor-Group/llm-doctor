/**
 * Request Logger - manages request/response logging
 */

import { RequestLog, ResponseData } from '../../types/index.js';
import { Helpers } from '../../utils/index.js';

export class RequestLogger {
  private requestHistory: RequestLog[] = [];
  private pendingRequests: Map<string, RequestLog> = new Map();
  private readonly maxHistorySize: number;

  constructor(maxHistorySize: number = 100) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Log a new request
   */
  logRequest(
    endpoint: string,
    method: string,
    body: Record<string, unknown>,
    headers: Record<string, string | string[] | undefined>
  ): string {
    const timestamp = Helpers.formatTimestamp();
    const requestId = `${timestamp}-${Math.random().toString(36).substring(7)}`;

    const requestData: RequestLog = {
      timestamp,
      endpoint,
      method,
      body,
      headers,
      executionTime: Date.now()
    };

    this.pendingRequests.set(requestId, requestData);
    this.addToHistory(requestData);

    return requestId;
  }

  /**
   * Log response for a request
   */
  logResponse(requestId: string, response: ResponseData): void {
    const request = this.pendingRequests.get(requestId);
    if (request) {
      request.response = response;

      // Calculate execution time and extract tokens
      if (request.executionTime && !response.streaming) {
        request.executionTime = Date.now() - request.executionTime;
      }
      if (response.usage) {
        request.tokens = response.usage.total_tokens;
        request.tokensIn = response.usage.prompt_tokens;
        request.tokensOut = response.usage.completion_tokens;
      }

      // Clear streaming content when stream completes
      if (!response.streaming) {
        request.streamingContent = undefined;
        this.pendingRequests.delete(requestId);
      }
    }
  }

  /**
   * Update streaming content for a request
   */
  updateStreamingContent(requestId: string, chunk: string): void {
    const request = this.pendingRequests.get(requestId);
    if (request) {
      if (!request.streamingContent) {
        request.streamingContent = '';
      }
      request.streamingContent += chunk;
    }
  }

  /**
   * Mark request as aborted (only if still pending)
   */
  markAsAborted(requestId: string): void {
    const request = this.pendingRequests.get(requestId);
    // Only mark as aborted if the request is still pending (not completed)
    if (request && !request.response) {
      request.aborted = true;
      this.pendingRequests.delete(requestId);
    }
  }

  /**
   * Get request by ID
   */
  getRequest(requestId: string): RequestLog | undefined {
    return this.pendingRequests.get(requestId);
  }

  /**
   * Get all request history
   */
  getHistory(): RequestLog[] {
    return this.requestHistory;
  }

  /**
   * Add request to history (with size limit)
   */
  private addToHistory(request: RequestLog): void {
    this.requestHistory.push(request);
    if (this.requestHistory.length > this.maxHistorySize) {
      this.requestHistory.shift();
    }
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.requestHistory = [];
    this.pendingRequests.clear();
  }
}
