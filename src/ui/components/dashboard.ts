/**
 * Dashboard - Main UI Controller
 */

import { RequestLogger } from '../../core/stats/request-logger.js';
import { StatsManager } from '../../core/stats/stats-manager.js';
import { PassthroughManager } from '../../core/passthrough/passthrough-manager.js';
import { ErrorSimulator } from '../../core/error-simulation/error-simulator.js';
import { TerminalUIPro } from './terminal-ui-pro.js';

export class Dashboard {
  private ui: TerminalUIPro;

  constructor(
    private requestLogger: RequestLogger,
    private statsManager: StatsManager,
    private passthroughManager: PassthroughManager,
    private errorSimulator: ErrorSimulator,
    private host: string,
    private port: number
  ) {
    this.ui = new TerminalUIPro(
      statsManager.getStats(),
      requestLogger,
      passthroughManager,
      errorSimulator,
      host,
      port
    );
  }

  /**
   * Start the dashboard
   */
  start(): void {
    this.ui.start();
  }

  /**
   * Stop the dashboard
   */
  stop(): void {
    this.ui.destroy();
  }

  /**
   * Get the terminal UI instance
   */
  getUI(): TerminalUIPro {
    return this.ui;
  }
}
