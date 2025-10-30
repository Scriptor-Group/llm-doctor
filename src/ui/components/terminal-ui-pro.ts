/**
 * Terminal UI Pro - Advanced Terminal Interface with Tools/Headers/Params view
 */

import blessed from 'blessed';
import { Stats, RequestLog } from '../../types/index.js';
import { RequestLogger } from '../../core/stats/request-logger.js';
import { PassthroughManager } from '../../core/passthrough/passthrough-manager.js';
import { ErrorSimulator } from '../../core/error-simulation/error-simulator.js';
import { ErrorMenu } from './error-menu.js';
import { ApiKeyDialog } from './api-key-dialog.js';
import { Helpers } from '../../utils/index.js';

type FocusPanel = 'list' | 'messages' | 'response' | 'tools' | 'headers';

export class TerminalUIPro {
  private screen: blessed.Widgets.Screen;
  private stats: Stats;
  private updateInterval: NodeJS.Timeout | null = null;
  private currentFocus: FocusPanel = 'list';
  private selectedIndex: number = -1;
  private confirmQuit: boolean = false;
  private isFullscreen: boolean = false;
  private expandedMessages: Set<number> = new Set();
  private messageListIndex: number = 0;
  private errorMenu: ErrorMenu | null = null;
  private apiKeyDialog: ApiKeyDialog | null = null;

  // UI Components
  private headerBox!: blessed.Widgets.BoxElement;
  private statsBox!: blessed.Widgets.BoxElement;
  private requestList!: blessed.Widgets.ListElement;
  private messagesBox!: blessed.Widgets.BoxElement;
  private responseBox!: blessed.Widgets.BoxElement;
  private toolsBox!: blessed.Widgets.BoxElement;
  private headersBox!: blessed.Widgets.BoxElement;
  private helpBox!: blessed.Widgets.BoxElement;

  constructor(
    stats: Stats,
    private requestLogger: RequestLogger,
    private passthroughManager: PassthroughManager,
    private errorSimulator: ErrorSimulator,
    private host: string,
    private port: number
  ) {
    this.stats = stats;

    this.screen = blessed.screen({
      smartCSR: true,
      title: 'LLM Doctor',
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

    // Stats box (top right)
    this.statsBox = blessed.box({
      top: 3,
      right: 0,
      width: '25%',
      height: 20,
      label: ' Stats ',
      tags: true,
      border: { type: 'line', fg: 'green' as unknown as number },
      style: { bg: 'black', fg: 'white' },
      padding: { left: 1, right: 1, top: 1 }
    });

    // Request list (top left)
    this.requestList = blessed.list({
      top: 3,
      left: 0,
      width: '75%',
      height: 20,
      label: ' Request History ',
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
      scrollable: true,
      alwaysScroll: true
    });

    // Messages panel (bottom left - 25%)
    this.messagesBox = blessed.box({
      top: 23,
      left: 0,
      width: '25%',
      height: '100%-26',
      label: ' Messages ',
      tags: true,
      border: { type: 'line', fg: 'magenta' as unknown as number },
      style: { bg: 'black', fg: 'white' },
      padding: { left: 1, right: 1 },
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true
    });

    // Response panel (bottom center-left - 25%)
    this.responseBox = blessed.box({
      top: 23,
      left: '25%',
      width: '25%',
      height: '100%-26',
      label: ' Response ',
      tags: true,
      border: { type: 'line', fg: 'green' as unknown as number },
      style: { bg: 'black', fg: 'white' },
      padding: { left: 1, right: 1 },
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true
    });

    // Tools panel (bottom center-right - 25%)
    this.toolsBox = blessed.box({
      top: 23,
      left: '50%',
      width: '25%',
      height: '100%-26',
      label: ' Tools ',
      tags: true,
      border: { type: 'line', fg: 'yellow' as unknown as number },
      style: { bg: 'black', fg: 'white' },
      padding: { left: 1, right: 1 },
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true
    });

    // Headers panel (bottom right - 25%)
    this.headersBox = blessed.box({
      top: 23,
      left: '75%',
      width: '25%',
      height: '100%-26',
      label: ' Headers ',
      tags: true,
      border: { type: 'line', fg: 'cyan' as unknown as number },
      style: { bg: 'black', fg: 'white' },
      padding: { left: 1, right: 1 },
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true
    });

    // Help box (bottom)
    this.helpBox = blessed.box({
      bottom: 0,
      left: 0,
      width: '100%',
      height: 3,
      tags: true,
      border: { type: 'line', fg: 'gray' as unknown as number },
      style: { bg: 'black' },
      content: ''
    });

    // Append all widgets
    this.screen.append(this.headerBox);
    this.screen.append(this.statsBox);
    this.screen.append(this.requestList);
    this.screen.append(this.messagesBox);
    this.screen.append(this.responseBox);
    this.screen.append(this.toolsBox);
    this.screen.append(this.headersBox);
    this.screen.append(this.helpBox);

    // Handle list selection
    this.requestList.on('select', (_, index) => {
      // Skip header (index 0)
      if (index === 0) return;

      const history = this.requestLogger.getHistory();
      // Adjust index to account for header
      const actualIndex = history.length - index;
      const req = history[actualIndex];
      if (req && !req.response?.streaming) {
        this.selectedIndex = index;
        // Reset message navigation state when selecting a new request
        this.messageListIndex = 0;
        this.expandedMessages.clear();
        this.showRequestDetails(req);
      }
    });

    this.updateFocus();
    this.updateHelpText();
  }

  /**
   * Setup key bindings
   */
  private setupKeyBindings(): void {
    // Ctrl+C quits immediately
    this.screen.key(['C-c'], () => {
      this.destroy();
      process.exit(0);
    });

    // Quit with confirmation
    this.screen.key(['q'], () => {
      if (this.confirmQuit) {
        this.destroy();
        process.exit(0);
      } else {
        this.confirmQuit = true;
        this.helpBox.setContent('{center}{red-fg}{bold}Press Q again to quit{/bold}{/red-fg}{/center}');
        this.screen.render();

        // Reset confirmation after 3 seconds
        setTimeout(() => {
          if (this.confirmQuit) {
            this.confirmQuit = false;
            this.updateHelpText();
            this.screen.render();
          }
        }, 3000);
      }
    });

    this.screen.key(['tab'], () => {
      this.confirmQuit = false;
      if (!this.isFullscreen) {
        const panels: FocusPanel[] = ['list', 'messages', 'response', 'tools', 'headers'];
        const currentIdx = panels.indexOf(this.currentFocus);
        this.currentFocus = panels[(currentIdx + 1) % panels.length];
        this.updateFocus();
      }
    });

    this.screen.key(['f'], () => {
      this.confirmQuit = false;
      this.toggleFullscreen();
    });

    this.screen.key(['escape'], () => {
      this.confirmQuit = false;
      if (this.isFullscreen) {
        this.toggleFullscreen();
      }
    });

    this.screen.key(['p'], () => {
      this.confirmQuit = false;
      this.passthroughManager.toggle();
      this.render();
    });

    this.screen.key(['r'], () => {
      this.confirmQuit = false;
      this.render();
    });

    this.screen.key(['m'], () => {
      this.confirmQuit = false;
      this.showErrorMenu();
    });

    this.screen.key(['k'], () => {
      this.confirmQuit = false;
      this.showApiKeyDialog();
    });

    // Navigate messages when in messages panel
    this.screen.key(['j', 'down'], () => {
      if (this.currentFocus === 'messages') {
        this.confirmQuit = false;
        const history = this.requestLogger.getHistory();
        const actualIndex = this.selectedIndex > 0 ? history.length - this.selectedIndex : -1;
        const req = history[actualIndex];
        if (req?.body.messages && Array.isArray(req.body.messages)) {
          const messages = req.body.messages as Array<{ role: string; content: string }>;
          if (this.messageListIndex < messages.length - 1) {
            this.messageListIndex++;
            this.showRequestDetails(req);
          }
        }
      }
    });

    this.screen.key(['k', 'up'], () => {
      if (this.currentFocus === 'messages') {
        this.confirmQuit = false;
        if (this.messageListIndex > 0) {
          this.messageListIndex--;
          const history = this.requestLogger.getHistory();
          const actualIndex = this.selectedIndex > 0 ? history.length - this.selectedIndex : -1;
          const req = history[actualIndex];
          if (req) {
            this.showRequestDetails(req);
          }
        }
      }
    });

    // Toggle message expansion with Enter or Space
    this.screen.key(['enter', 'space'], () => {
      if (this.currentFocus === 'messages') {
        this.confirmQuit = false;
        const history = this.requestLogger.getHistory();
        const actualIndex = this.selectedIndex > 0 ? history.length - this.selectedIndex : -1;
        const req = history[actualIndex];
        if (req?.body.messages && Array.isArray(req.body.messages)) {
          if (this.expandedMessages.has(this.messageListIndex)) {
            this.expandedMessages.delete(this.messageListIndex);
          } else {
            this.expandedMessages.add(this.messageListIndex);
          }
          this.showRequestDetails(req);
        }
      }
    });

    // Expand/Collapse all messages
    this.screen.key(['e'], () => {
      if (this.currentFocus === 'messages') {
        this.confirmQuit = false;
        const history = this.requestLogger.getHistory();
        const actualIndex = this.selectedIndex > 0 ? history.length - this.selectedIndex : -1;
        const req = history[actualIndex];
        if (req?.body.messages && Array.isArray(req.body.messages)) {
          const messages = req.body.messages as Array<{ role: string; content: string }>;
          // Toggle: if all expanded, collapse all; otherwise expand all
          if (this.expandedMessages.size === messages.length) {
            this.expandedMessages.clear();
          } else {
            this.expandedMessages.clear();
            messages.forEach((_, i) => this.expandedMessages.add(i));
          }
          this.showRequestDetails(req);
        }
      }
    });
  }

  /**
   * Update focused panel
   */
  private updateFocus(): void {
    // Reset all borders
    this.requestList.style.border = { fg: 'yellow' as unknown as number };
    this.messagesBox.style.border = { fg: 'magenta' as unknown as number };
    this.responseBox.style.border = { fg: 'green' as unknown as number };
    this.toolsBox.style.border = { fg: 'yellow' as unknown as number };
    this.headersBox.style.border = { fg: 'cyan' as unknown as number };

    // Highlight focused
    const panels = {
      list: this.requestList,
      messages: this.messagesBox,
      response: this.responseBox,
      tools: this.toolsBox,
      headers: this.headersBox
    };

    const panel = panels[this.currentFocus];
    if (panel) {
      panel.style.border = { fg: 'white' as unknown as number };
      panel.focus();
    }

    this.updateHelpText();
    this.screen.render();
  }

  /**
   * Toggle fullscreen mode for detail panels
   */
  private toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;

    if (this.isFullscreen) {
      // Only allow fullscreen for detail panels
      if (this.currentFocus === 'list') {
        this.isFullscreen = false;
        return;
      }

      // Hide other panels
      this.headerBox.hide();
      this.statsBox.hide();
      this.requestList.hide();
      this.helpBox.hide();

      // Expand focused panel to fullscreen
      const panel = this.currentFocus === 'messages' ? this.messagesBox :
                    this.currentFocus === 'response' ? this.responseBox :
                    this.currentFocus === 'tools' ? this.toolsBox :
                    this.headersBox;

      panel.top = 0;
      panel.left = 0;
      panel.width = '100%';
      panel.height = '100%';

      // Hide other detail panels
      if (this.currentFocus !== 'messages') this.messagesBox.hide();
      if (this.currentFocus !== 'response') this.responseBox.hide();
      if (this.currentFocus !== 'tools') this.toolsBox.hide();
      if (this.currentFocus !== 'headers') this.headersBox.hide();

    } else {
      // Restore normal layout
      this.headerBox.show();
      this.statsBox.show();
      this.requestList.show();
      this.helpBox.show();
      this.messagesBox.show();
      this.responseBox.show();
      this.toolsBox.show();
      this.headersBox.show();

      // Restore positions
      this.messagesBox.top = 23;
      this.messagesBox.left = 0;
      this.messagesBox.width = '25%';
      this.messagesBox.height = '100%-26';

      this.responseBox.top = 23;
      this.responseBox.left = '25%';
      this.responseBox.width = '25%';
      this.responseBox.height = '100%-26';

      this.toolsBox.top = 23;
      this.toolsBox.left = '50%';
      this.toolsBox.width = '25%';
      this.toolsBox.height = '100%-26';

      this.headersBox.top = 23;
      this.headersBox.left = '75%';
      this.headersBox.width = '25%';
      this.headersBox.height = '100%-26';
    }

    this.updateHelpText();
    this.screen.render();
  }

  /**
   * Update help text
   */
  private updateHelpText(): void {
    let content = '{center}';

    if (this.isFullscreen) {
      content += '{yellow-fg}↑↓{/yellow-fg}:Scroll  ' +
        '{yellow-fg}f/Esc{/yellow-fg}:Exit Fullscreen  ' +
        '{yellow-fg}q{/yellow-fg}:Quit (2x)  ' +
        '{yellow-fg}Ctrl+C{/yellow-fg}:Force Quit';
    } else if (this.currentFocus === 'messages') {
      content += '{yellow-fg}Tab{/yellow-fg}:Switch  ' +
        '{yellow-fg}↑↓/jk{/yellow-fg}:Navigate  ' +
        '{yellow-fg}Enter/Space{/yellow-fg}:Toggle  ' +
        '{yellow-fg}e{/yellow-fg}:Expand All  ' +
        '{yellow-fg}f{/yellow-fg}:Fullscreen  ' +
        '{yellow-fg}p{/yellow-fg}:Toggle Mode  ' +
        '{yellow-fg}m{/yellow-fg}:Errors  ' +
        '{yellow-fg}q{/yellow-fg}:Quit (2x)';
    } else {
      content += '{yellow-fg}Tab{/yellow-fg}:Switch  ' +
        '{yellow-fg}↑↓{/yellow-fg}:Navigate  ' +
        '{yellow-fg}Enter{/yellow-fg}:Select  ' +
        '{yellow-fg}f{/yellow-fg}:Fullscreen  ' +
        '{yellow-fg}p{/yellow-fg}:Toggle Mode  ' +
        '{yellow-fg}k{/yellow-fg}:API Key  ' +
        '{yellow-fg}m{/yellow-fg}:Errors  ' +
        '{yellow-fg}r{/yellow-fg}:Refresh  ' +
        '{yellow-fg}q{/yellow-fg}:Quit';
    }

    content += '{/center}';
    this.helpBox.setContent(content);
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
    // Recalculate uptime each time for real-time display
    const uptimeSeconds = Math.floor((Date.now() - this.stats.start_time) / 1000);
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    const uptime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const mode = this.passthroughManager.isEnabled() ? '{green-fg}PASSTHROUGH{/green-fg}' : '{yellow-fg}FAKE{/yellow-fg}';
    const url = `http://${this.host}:${this.port}`;

    const errorStatus = this.errorSimulator.isEnabled()
      ? `{red-fg}ERROR: ${this.errorSimulator.getErrorTypeName(this.errorSimulator.getCurrentErrorType())}{/red-fg}`
      : '';

    const content = `{center}{bold}{cyan-fg}LLM DOCTOR{/cyan-fg}{/bold}  |  ` +
      `{blue-fg}${url}{/blue-fg}  |  ` +
      `{yellow-fg}Uptime:{/yellow-fg} ${uptime}  |  ` +
      `{magenta-fg}Requests:{/magenta-fg} ${this.stats.total_requests}  |  ` +
      `Mode: ${mode}` +
      (errorStatus ? `  |  ${errorStatus}` : '') +
      `{/center}`;

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
   * Show request details in all panels
   */
  private showRequestDetails(req: RequestLog): void {
    this.showMessages(req);
    this.showResponse(req);
    this.showTools(req);
    this.showHeaders(req);
    this.screen.render();
  }

  /**
   * Show messages panel
   */
  private showMessages(req: RequestLog): void {
    const lines: string[] = [];

    lines.push('');
    lines.push(`{bold}{cyan-fg}Endpoint:{/cyan-fg}{/bold} ${req.endpoint}`);
    lines.push(`{bold}{cyan-fg}Time:{/cyan-fg}{/bold} ${req.timestamp}`);
    if (req.body.model) {
      lines.push(`{bold}{cyan-fg}Model:{/cyan-fg}{/bold} ${req.body.model}`);
    }
    lines.push('');

    // Parameters
    lines.push('{bold}{white-fg}━━━ PARAMETERS ━━━{/white-fg}{/bold}');
    lines.push('');
    const params = ['temperature', 'max_tokens', 'top_p', 'top_k', 'frequency_penalty', 'presence_penalty', 'n', 'stream'];
    params.forEach(param => {
      if (req.body[param] !== undefined) {
        lines.push(`{cyan-fg}${param.padEnd(20)}{/cyan-fg} {white-fg}${JSON.stringify(req.body[param])}{/white-fg}`);
      }
    });
    lines.push('');

    // Messages
    if (req.body.messages && Array.isArray(req.body.messages)) {
      lines.push('{bold}{white-fg}━━━ MESSAGES ━━━{/white-fg}{/bold}');
      lines.push('');
      const messages = req.body.messages as Array<{ role: string; content: string }>;
      messages.forEach((msg, i) => {
        const roleColor = msg.role === 'user' ? 'blue' : msg.role === 'assistant' ? 'green' : 'yellow';
        const roleIcon = msg.role === 'user' ? '►' : msg.role === 'assistant' ? '◄' : '•';
        const isExpanded = this.expandedMessages.has(i);
        const expandIcon = isExpanded ? '▼' : '▶';
        const isSelected = this.currentFocus === 'messages' && this.messageListIndex === i;
        const highlight = isSelected ? '{inverse}' : '';
        const highlightEnd = isSelected ? '{/inverse}' : '';

        lines.push(`${highlight}{bold}${expandIcon} ${roleIcon} {${roleColor}-fg}${msg.role.toUpperCase()}{/${roleColor}-fg}{/bold}${highlightEnd}`);

        if (isExpanded) {
          lines.push('');
          const content = String(msg.content).replace(/\{/g, '{{').replace(/\}/g, '}}');
          lines.push(`{white-fg}${content}{/white-fg}`);
        }

        if (i < messages.length - 1) lines.push('');
      });
    }

    // Prompt
    if (req.body.prompt) {
      lines.push('');
      lines.push('{bold}{blue-fg}[PROMPT]{/blue-fg}{/bold}');
      lines.push('');
      const prompt = String(req.body.prompt).replace(/\{/g, '{{').replace(/\}/g, '}}');
      lines.push(`{white-fg}${prompt}{/white-fg}`);
    }

    // Input (for embeddings)
    if (req.body.input) {
      lines.push('');
      lines.push('{bold}{blue-fg}[INPUT]{/blue-fg}{/bold}');
      lines.push('');
      const input = Array.isArray(req.body.input) ? req.body.input : [req.body.input];
      input.forEach((item, i) => {
        const content = String(item).replace(/\{/g, '{{').replace(/\}/g, '}}');
        lines.push(`{cyan-fg}[${i}]{/cyan-fg} {white-fg}${content}{/white-fg}`);
      });
    }

    this.messagesBox.setContent(lines.join('\n'));
  }

  /**
   * Show response panel
   */
  private showResponse(req: RequestLog): void {
    const lines: string[] = [];

    if (req.response) {
      lines.push('');
      lines.push(req.response.streaming ? '{bold}{blue-fg}[STREAMING]{/blue-fg}{/bold}' : '{bold}{green-fg}[COMPLETE]{/green-fg}{/bold}');
      lines.push('');

      if (req.response.model) {
        lines.push(`{cyan-fg}Model:{/cyan-fg} {white-fg}${req.response.model}{/white-fg}`);
      }
      if (req.response.finishReason) {
        lines.push(`{cyan-fg}Finish:{/cyan-fg} {white-fg}${req.response.finishReason}{/white-fg}`);
      }
      if (req.response.usage) {
        lines.push(`{cyan-fg}Tokens:{/cyan-fg} {white-fg}${req.response.usage.total_tokens}{/white-fg}`);
      }

      // Tool Calls section
      if (req.response.toolCalls && req.response.toolCalls.length > 0) {
        lines.push('');
        lines.push('{bold}{white-fg}━━━ TOOL CALLS ━━━{/white-fg}{/bold}');
        lines.push('');

        req.response.toolCalls.forEach((call, i) => {
          lines.push(`{bold}{yellow-fg}[${i + 1}] ${call.function.name}{/yellow-fg}{/bold}`);
          lines.push(`{cyan-fg}ID:{/cyan-fg} {gray-fg}${call.id}{/gray-fg}`);
          lines.push(`{cyan-fg}Type:{/cyan-fg} {white-fg}${call.type}{/white-fg}`);
          lines.push('');
          lines.push('{cyan-fg}Arguments:{/cyan-fg}');

          try {
            const args = typeof call.function.arguments === 'string'
              ? JSON.parse(call.function.arguments)
              : call.function.arguments;
            const argsStr = JSON.stringify(args, null, 2).replace(/\{/g, '{{').replace(/\}/g, '}}');
            lines.push(`{white-fg}${argsStr}{/white-fg}`);
          } catch (e) {
            const escapedArgs = String(call.function.arguments).replace(/\{/g, '{{').replace(/\}/g, '}}');
            lines.push(`{white-fg}${escapedArgs}{/white-fg}`);
          }

          if (req.response?.toolCalls && i < req.response.toolCalls.length - 1) {
            lines.push('');
            lines.push('{gray-fg}─────────{/gray-fg}');
          }
          lines.push('');
        });
      }

      // Content section
      lines.push('');
      lines.push('{bold}{white-fg}━━━ CONTENT ━━━{/white-fg}{/bold}');
      lines.push('');

      const content = (req.response.content || req.streamingContent || '').replace(/\{/g, '{{').replace(/\}/g, '}}');
      if (content) {
        lines.push(`{white-fg}${content}{/white-fg}`);
      } else {
        lines.push('{gray-fg}(no text content){/gray-fg}');
      }

      if (req.response.streaming) {
        lines.push('');
        lines.push('{blink}{white-fg}▊{/white-fg}{/blink}');
      }
    } else {
      lines.push('');
      lines.push('{center}{gray-fg}Waiting for response...{/gray-fg}{/center}');
    }

    this.responseBox.setContent(lines.join('\n'));
    this.responseBox.scrollTo(0);
  }

  /**
   * Show tools panel
   */
  private showTools(req: RequestLog): void {
    const lines: string[] = [];

    if (req.body.tools && Array.isArray(req.body.tools)) {
      const tools = req.body.tools as Array<Record<string, unknown>>;
      lines.push('');
      lines.push(`{center}{bold}{yellow-fg}${tools.length} Tool(s){/yellow-fg}{/bold}{/center}`);
      lines.push('');

      tools.forEach((tool, i) => {
        const func = (tool.function && typeof tool.function === 'object') ? tool.function as Record<string, unknown> : null;
        const toolName = func?.name ? String(func.name) : `Tool ${i + 1}`;

        lines.push(`{bold}{cyan-fg}${i + 1}. ${toolName}{/cyan-fg}{/bold}`);
        lines.push('');

        if (func?.description) {
          const desc = String(func.description).replace(/\{/g, '{{').replace(/\}/g, '}}');
          lines.push(`{white-fg}${desc}{/white-fg}`);
          lines.push('');
        }

        if (func?.parameters) {
          lines.push('{bold}{cyan-fg}Params:{/cyan-fg}{/bold}');
          const paramsStr = JSON.stringify(func.parameters, null, 2).replace(/\{/g, '{{').replace(/\}/g, '}}');
          lines.push(`{white-fg}${paramsStr}{/white-fg}`);
          lines.push('');
        }

        if (i < tools.length - 1) {
          lines.push('{gray-fg}──────────{/gray-fg}');
          lines.push('');
        }
      });
    } else {
      lines.push('');
      lines.push('{center}{gray-fg}No tools{/gray-fg}{/center}');
    }

    this.toolsBox.setContent(lines.join('\n'));
    this.toolsBox.scrollTo(0);
  }

  /**
   * Show headers panel
   */
  private showHeaders(req: RequestLog): void {
    const lines: string[] = [];

    const headers = Object.entries(req.headers);
    if (headers.length > 0) {
      lines.push('');
      headers.forEach(([key, value]) => {
        lines.push(`{bold}{cyan-fg}${key}{/cyan-fg}{/bold}`);
        const val = String(value).substring(0, 30);
        lines.push(`{white-fg}${val}{/white-fg}`);
        lines.push('');
      });
    } else {
      lines.push('');
      lines.push('{center}{gray-fg}No headers{/gray-fg}{/center}');
    }

    this.headersBox.setContent(lines.join('\n'));
    this.headersBox.scrollTo(0);
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
   * Show error simulation menu
   */
  private showErrorMenu(): void {
    if (!this.errorMenu) {
      this.errorMenu = new ErrorMenu(
        this.screen,
        this.errorSimulator,
        () => {
          this.errorMenu = null;
          this.requestList.focus();
          this.render();
        }
      );
    }
    this.errorMenu.show();
  }

  /**
   * Show API key input dialog
   */
  private showApiKeyDialog(): void {
    if (!this.apiKeyDialog) {
      this.apiKeyDialog = new ApiKeyDialog(
        this.screen,
        this.passthroughManager,
        () => {
          this.apiKeyDialog = null;
          this.requestList.focus();
          this.render();
        }
      );
    }
    this.apiKeyDialog.show();
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
