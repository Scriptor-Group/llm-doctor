/**
 * Error Simulator - Simulates various LLM API errors
 */

import { ErrorSimulationType, ERROR_CONFIGS, ErrorConfig } from './error-types.js';

export class ErrorSimulator {
  private currentErrorType: ErrorSimulationType = 'none';
  private enabled: boolean = false;

  /**
   * Enable error simulation with specific error type
   */
  enable(errorType: ErrorSimulationType): void {
    this.enabled = true;
    this.currentErrorType = errorType;
  }

  /**
   * Disable error simulation
   */
  disable(): void {
    this.enabled = false;
    this.currentErrorType = 'none';
  }

  /**
   * Toggle error simulation on/off
   */
  toggle(): void {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.currentErrorType = 'none';
    }
  }

  /**
   * Check if error simulation is enabled
   */
  isEnabled(): boolean {
    return this.enabled && this.currentErrorType !== 'none';
  }

  /**
   * Get current error type
   */
  getCurrentErrorType(): ErrorSimulationType {
    return this.currentErrorType;
  }

  /**
   * Get current error configuration
   */
  getCurrentErrorConfig(): ErrorConfig | null {
    if (!this.isEnabled()) {
      return null;
    }
    return ERROR_CONFIGS[this.currentErrorType];
  }

  /**
   * Get error response object for API
   */
  getErrorResponse(): { status: number; body: Record<string, unknown> } | null {
    const config = this.getCurrentErrorConfig();
    if (!config) {
      return null;
    }

    return {
      status: config.httpStatus,
      body: {
        error: {
          message: config.message,
          type: config.errorCode,
          code: config.errorCode,
          ...config.details
        }
      }
    };
  }

  /**
   * Get all available error types
   */
  getAvailableErrorTypes(): ErrorSimulationType[] {
    return Object.keys(ERROR_CONFIGS).filter(
      (type) => type !== 'none'
    ) as ErrorSimulationType[];
  }

  /**
   * Get human-readable error type name
   */
  getErrorTypeName(errorType: ErrorSimulationType): string {
    const names: Record<ErrorSimulationType, string> = {
      none: 'None',
      safety_content_filter: 'Safety Content Filter (Microsoft/Azure)',
      rate_limit: 'Rate Limit Exceeded',
      model_overloaded: 'Model Overloaded',
      timeout: 'Request Timeout',
      invalid_request: 'Invalid Request Error',
      authentication_error: 'Authentication Error',
      context_length_exceeded: 'Context Length Exceeded'
    };
    return names[errorType] || errorType;
  }
}
