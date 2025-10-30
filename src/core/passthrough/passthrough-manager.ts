/**
 * Passthrough Manager - controls passthrough mode
 */

import { PassthroughConfig } from '../../types/index.js';
import * as dotenv from 'dotenv';

export class PassthroughManager {
  private config: PassthroughConfig;

  constructor() {
    dotenv.config();

    const apiKey = process.env.OPENAI_API_KEY;
    const baseURL = process.env.OPENAI_BASE_URL;
    const model = process.env.OPENAI_MODEL;

    this.config = {
      enabled: !!apiKey, // Enable by default if API key is present
      apiKey,
      baseURL,
      model,
      timeout: 60000
    };
  }

  /**
   * Check if passthrough is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled && this.hasApiKey();
  }

  /**
   * Check if API key is configured
   */
  hasApiKey(): boolean {
    return !!this.config.apiKey;
  }

  /**
   * Enable passthrough mode
   */
  enable(): void {
    if (this.hasApiKey()) {
      this.config.enabled = true;
    }
  }

  /**
   * Disable passthrough mode
   */
  disable(): void {
    this.config.enabled = false;
  }

  /**
   * Toggle passthrough mode
   */
  toggle(): boolean {
    this.config.enabled = !this.config.enabled && this.hasApiKey();
    return this.config.enabled;
  }

  /**
   * Get passthrough configuration
   */
  getConfig(): PassthroughConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(partial: Partial<PassthroughConfig>): void {
    this.config = { ...this.config, ...partial };
  }
}
