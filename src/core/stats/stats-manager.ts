/**
 * Statistics Manager
 */

import { Stats, StatType } from '../../types/index.js';

export class StatsManager {
  private stats: Stats;
  private requestTimestamps: number[] = [];
  private responseTimes: number[] = [];

  constructor() {
    this.stats = {
      total_requests: 0,
      completions: 0,
      chat_completions: 0,
      embeddings: 0,
      models: 0,
      errors: 0,
      start_time: Date.now(),
      total_prompt_tokens: 0,
      total_completion_tokens: 0,
      total_tokens: 0,
      avg_response_time: 0,
      requests_per_minute: 0
    };
  }

  /**
   * Get current stats (returns reference for real-time updates)
   */
  getStats(): Stats {
    return this.stats;
  }

  /**
   * Increment a specific stat counter
   */
  incrementStat(type: StatType): void {
    this.stats[type]++;
  }

  /**
   * Increment total requests counter
   */
  incrementRequests(): void {
    this.stats.total_requests++;
    this.updateRequestsPerMinute();
  }

  /**
   * Add token counts to stats
   */
  addTokens(promptTokens: number, completionTokens: number): void {
    this.stats.total_prompt_tokens += promptTokens;
    this.stats.total_completion_tokens += completionTokens;
    this.stats.total_tokens += promptTokens + completionTokens;
  }

  /**
   * Record a response time
   */
  addResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }
    this.updateAverageResponseTime();
  }

  /**
   * Update requests per minute calculation
   */
  private updateRequestsPerMinute(): void {
    const now = Date.now();
    this.requestTimestamps.push(now);

    // Keep only last 60 seconds
    const oneMinuteAgo = now - 60000;
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneMinuteAgo);

    this.stats.requests_per_minute = this.requestTimestamps.length;
  }

  /**
   * Update average response time
   */
  private updateAverageResponseTime(): void {
    if (this.responseTimes.length > 0) {
      const sum = this.responseTimes.reduce((a, b) => a + b, 0);
      this.stats.avg_response_time = sum / this.responseTimes.length;
    }
  }

  /**
   * Reset all stats
   */
  reset(): void {
    this.stats = {
      total_requests: 0,
      completions: 0,
      chat_completions: 0,
      embeddings: 0,
      models: 0,
      errors: 0,
      start_time: Date.now(),
      total_prompt_tokens: 0,
      total_completion_tokens: 0,
      total_tokens: 0,
      avg_response_time: 0,
      requests_per_minute: 0
    };
    this.requestTimestamps = [];
    this.responseTimes = [];
  }
}
