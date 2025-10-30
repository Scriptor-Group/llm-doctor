/**
 * UUID generation utility
 */

import crypto from 'crypto';

export class UUIDGenerator {
  /**
   * Generate a random UUID v4
   */
  static generate(): string {
    return crypto.randomUUID();
  }

  /**
   * Generate a prefixed ID (e.g., cmpl-xxx, chatcmpl-xxx)
   */
  static generateWithPrefix(prefix: string): string {
    return `${prefix}-${this.generate()}`;
  }
}
