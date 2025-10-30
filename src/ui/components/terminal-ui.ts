/**
 * Terminal UI - Blessed-based Terminal Interface
 * Simplified version focusing on clean architecture
 */

import blessed from 'blessed';
import { Stats, RequestLog } from '../../types/index.js';
import { RequestLogger } from '../../core/stats/request-logger.js';
import { PassthroughManager } from '../../core/passthrough/passthrough-manager.js';
import { Helpers } from '../../utils/index.js';

export class TerminalUI {
  private screen: blessed.Widgets.Screen;
  private stats: Stats;
  private updateInterval: NodeJS.Timeout | null = null;

  // UI Components
  private headerBox!: blessed.Widgets.BoxElement;
  private statsBox!: blessed.Widgets.BoxElement;
  private requestList!: blessed.Widgets.ListElement;
  private detailsBox!: blessed.Widgets.BoxElement;

  constructor(
    stats: Stats,
    private requestLogger: RequestLogger,
    private passthroughManager: PassthroughManager
  ) {
    this.stats = stats;

    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Fake vLLM Server Monitor v2',
      fullUnicode: true
    });

    this.createLayout();
    this.setupKeyBindings();
    this.startAutoUpdate();
  }

  /**
   * Create UI layout
   */
  private createLayout(): void {
    // Header
    this.headerBox = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: '',
      tags: true,
      border: { type: 'line', fg: 'cyan' as unknown as number },
      style: { bg: 'black', fg: 'cyan' }
    });

    // Stats box
    this.statsBox = blessed.box({
      top: 3,
      right: 0,
      width: '25%',
      height: '50%-3',
      label: ' 📊 Stats ',
      tags: true,
      border: { type: 'line', fg: 'green' as unknown as number },
      style: { bg: 'black', fg: 'white' },
      scrollable: true
    });

    // Request list
    this.requestList = blessed.list({
      top: 3,
      left: 0,
      width: '75%',
      height: '50%-3',
      label: ' 📝 Request History ',
      keys: true,
      vi: true,
      mouse: true,
      tags: true,
      border: { type: 'line', fg: 'yellow' as unknown as number },
      style: {
        bg: 'black',
        fg: 'white',
        selected: { bg: 'blue', fg: 'white', bold: true }
      },
      scrollable: true
    });

    // Details box
    this.detailsBox = blessed.box({
      top: '50%',
      left: 0,
      width: '100%',
      height: '50%',
      label: ' 📄 Request Details ',
      tags: true,
      border: { type: 'line', fg: 'magenta' as unknown as number },
      style: { bg: 'black', fg: 'white' },
      scrollable: true,
      keys: true,
      vi: true
    });

    // Append all widgets
    this.screen.append(this.headerBox);
    this.screen.append(this.statsBox);
    this.screen.append(this.requestList);
    this.screen.append(this.detailsBox);

    // List selection handler
    this.requestList.on('select', (_, index) => {
      const history = this.requestLogger.getHistory();
      const actualIndex = history.length - 1 - index;
      const req = history[actualIndex];
      if (req) {
        this.showRequestDetails(req);
      }
    });
  }

  /**
   * Setup key bindings
   */
  private setupKeyBindings(): void {
    this.screen.key(['escape', 'q', 'C-c'], () => {
      process.exit(0);
    });

    this.screen.key(['p'], () => {
      this.passthroughManager.toggle();
      this.render();
    });

    this.screen.key(['r'], () => {
      this.render();
    });
  }

  /**
   * Start auto-update
   */
  private startAutoUpdate(): void {
    this.updateInterval = setInterval(() => {
      try {
        this.updateHeader();
        this.updateStats();
        this.updateRequestList();
        this.screen.render();
      } catch (error) {
        // Ignore render errors
      }
    }, 1000);
  }

  /**
   * Update header
   */
  private updateHeader(): void {
    const uptime = Helpers.formatUptime(this.stats.start_time);
    const mode = this.passthroughManager.isEnabled() ? '{green-fg}PASSTHROUGH{/green-fg}' : '{yellow-fg}FAKE{/yellow-fg}';

    const content = `{center}{bold}{cyan-fg}🤖 FAKE vLLM API SERVER v2{/cyan-fg}{/bold}  |  ` +
      `{yellow-fg}Uptime:{/yellow-fg} ${uptime}  |  ` +
      `{magenta-fg}Requests:{/magenta-fg} ${this.stats.total_requests}  |  ` +
      `Mode: ${mode}{/center}`;

    this.headerBox.setContent(content);
  }

  /**
   * Update stats display
   */
  private updateStats(): void {
    const lines: string[] = [];

    lines.push('{bold}{white-fg}═ REQUESTS ═{/white-fg}{/bold}');
    lines.push(`{cyan-fg}Total:{/cyan-fg} {bold}${this.stats.total_requests}{/bold}`);
    lines.push(`{cyan-fg}Completions:{/cyan-fg} ${this.stats.completions}`);
    lines.push(`{cyan-fg}Chat:{/cyan-fg} ${this.stats.chat_completions}`);
    lines.push(`{cyan-fg}Embeddings:{/cyan-fg} ${this.stats.embeddings}`);
    lines.push(`{red-fg}Errors:{/red-fg} ${this.stats.errors}`);
    lines.push('');
    lines.push('{bold}{white-fg}═ TOKENS ═{/white-fg}{/bold}');
    lines.push(`{cyan-fg}Prompt:{/cyan-fg} ${this.stats.total_prompt_tokens.toLocaleString()}`);
    lines.push(`{cyan-fg}Completion:{/cyan-fg} ${this.stats.total_completion_tokens.toLocaleString()}`);
    lines.push(`{cyan-fg}Total:{/cyan-fg} {bold}${this.stats.total_tokens.toLocaleString()}{/bold}`);
    lines.push('');
    lines.push('{bold}{white-fg}═ PERFORMANCE ═{/white-fg}{/bold}');
    lines.push(`{cyan-fg}Avg Time:{/cyan-fg} ${this.stats.avg_response_time.toFixed(0)}ms`);
    lines.push(`{cyan-fg}Req/min:{/cyan-fg} ${this.stats.requests_per_minute.toFixed(1)}`);

    this.statsBox.setContent(lines.join('\n'));
  }

  /**
   * Update request list
   */
  private updateRequestList(): void {
    const history = this.requestLogger.getHistory();

    // Create header
    const header = `{bold}{white-fg}  METHOD   ENDPOINT               TIME      TOKENS          TIMESTAMP{/white-fg}{/bold}`;

    const items = history.map(req => {
      const methodColor = req.method === 'GET' ? 'green' : 'yellow';
      let statusIcon = '{gray-fg}○{/gray-fg} '; // Default: waiting

      if (req.aborted) {
        statusIcon = '{red-fg}✗{/red-fg} '; // Aborted
      } else if (req.response?.streaming) {
        statusIcon = '{blue-fg}◉{/blue-fg} '; // Streaming
      } else if (req.response) {
        statusIcon = '{green-fg}✓{/green-fg} '; // Completed
      }

      const endpoint = req.endpoint.length > 20 ? req.endpoint.substring(0, 20) + '...' : req.endpoint;

      // Only show execution time if request is completed (not streaming and has response)
      const isCompleted = req.response && !req.response.streaming;
      const execTime = isCompleted && req.executionTime !== undefined
        ? `${(req.executionTime / 1000).toFixed(2)}s`.padStart(8)
        : '---'.padStart(8);

      const tokensIn = req.tokensIn !== undefined ? String(req.tokensIn).padStart(4) : '---'.padStart(4);
      const tokensOut = req.tokensOut !== undefined ? String(req.tokensOut).padStart(4) : '---'.padStart(4);
      const tokensDisplay = `{green-fg}${tokensIn}↓{/green-fg}{yellow-fg}${tokensOut}↑{/yellow-fg}`;

      return `${statusIcon}{${methodColor}-fg}${req.method.padEnd(8)}{/${methodColor}-fg} {cyan-fg}${endpoint.padEnd(22)}{/cyan-fg} {magenta-fg}${execTime}{/magenta-fg} ${tokensDisplay} ${req.timestamp}`;
    });

    // Add header at the beginning
    this.requestList.setItems([header, ...items.reverse()]);
  }

  /**
   * Show request details
   */
  private showRequestDetails(req: RequestLog): void {
    const lines: string[] = [];

    lines.push('');
    lines.push(`{bold}{cyan-fg}Endpoint:{/cyan-fg}{/bold} ${req.endpoint}`);
    lines.push(`{bold}{cyan-fg}Method:{/cyan-fg}{/bold} ${req.method}`);
    lines.push(`{bold}{cyan-fg}Time:{/cyan-fg}{/bold} ${req.timestamp}`);
    lines.push('');
    lines.push('{bold}{white-fg}━━━ REQUEST BODY ━━━{/white-fg}{/bold}');
    lines.push('');

    const bodyJson = JSON.stringify(req.body, null, 2);
    lines.push(bodyJson);

    if (req.response) {
      lines.push('');
      lines.push('{bold}{white-fg}━━━ RESPONSE ━━━{/white-fg}{/bold}');
      lines.push('');
      lines.push(`{bold}{green-fg}Content:{/green-fg}{/bold}`);
      lines.push(req.response.content || '(no content)');

      if (req.response.usage) {
        lines.push('');
        lines.push(`{bold}{cyan-fg}Tokens:{/cyan-fg}{/bold} ${req.response.usage.total_tokens}`);
      }
    }

    this.detailsBox.setContent(lines.join('\n'));
    this.detailsBox.scrollTo(0);
  }

  /**
   * Render the UI
   */
  render(): void {
    try {
      this.updateHeader();
      this.updateStats();
      this.updateRequestList();
      this.screen.render();
    } catch (error) {
      // Ignore render errors
    }
  }

  /**
   * Start the UI
   */
  start(): void {
    this.requestList.focus();
    this.render();
  }

  /**
   * Destroy the UI
   */
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.screen.destroy();
  }
}
