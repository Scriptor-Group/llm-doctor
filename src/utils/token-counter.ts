/**
 * Token counting utilities
 */

export class TokenCounter {
  /**
   * Simple token counter (approximation: ~4 chars per token)
   */
  static count(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Count tokens for various input types
   */
  static countInput(input: string | string[] | number | number[]): number {
    if (typeof input === 'string') {
      return this.count(input);
    }
    if (Array.isArray(input)) {
      return input.length;
    }
    return 1;
  }
}
