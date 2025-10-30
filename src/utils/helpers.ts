/**
 * General helper utilities
 */

export class Helpers {
  /**
   * Sleep for a given number of milliseconds
   */
  static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate a normalized embedding vector
   */
  static generateNormalizedEmbedding(dimensions: number): number[] {
    const vector: number[] = [];
    let sumSquares = 0;

    // Generate random values
    for (let i = 0; i < dimensions; i++) {
      const value = (Math.random() - 0.5) * 2;
      vector.push(value);
      sumSquares += value * value;
    }

    // Normalize
    const magnitude = Math.sqrt(sumSquares);
    return vector.map(v => v / magnitude);
  }

  /**
   * Format timestamp
   */
  static formatTimestamp(date: Date = new Date()): string {
    return date.toISOString().split('T')[1].slice(0, -1);
  }

  /**
   * Format uptime from milliseconds
   */
  static formatUptime(startTime: number): string {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
}
