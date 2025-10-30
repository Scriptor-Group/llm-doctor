/**
 * Error Simulation Menu Component
 */

import blessed from 'blessed';
import { ErrorSimulator } from '../../core/error-simulation/error-simulator.js';
import { ErrorSimulationType } from '../../core/error-simulation/error-types.js';

export class ErrorMenu {
  private menu: blessed.Widgets.ListElement | null = null;
  private visible: boolean = false;

  constructor(
    private screen: blessed.Widgets.Screen,
    private errorSimulator: ErrorSimulator,
    private onClose: () => void
  ) {}

  /**
   * Show the error simulation menu
   */
  show(): void {
    if (this.visible) return;

    // Create menu
    this.menu = blessed.list({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '70%',
      height: '60%',
      label: ' Simulate Completion Errors ',
      keys: true,
      vi: true,
      mouse: true,
      tags: true,
      border: { type: 'line', fg: 'red' as unknown as number },
      style: {
        bg: 'black',
        fg: 'white',
        selected: { bg: 'red', fg: 'white', bold: true }
      },
      scrollable: true,
      alwaysScroll: true
    });

    // Build menu items
    const items: string[] = [
      '{center}{bold}{white-fg}Select an error type to simulate:{/white-fg}{/bold}{/center}',
      '',
      this.formatMenuItem('none', 'None (Disable Error Simulation)'),
      '',
      '{bold}{red-fg}▼ Common LLM API Errors{/red-fg}{/bold}',
      '',
      this.formatMenuItem('safety_content_filter', 'Safety Content Filter'),
      '  {gray-fg}Microsoft/Azure content policy violation{/gray-fg}',
      '',
      this.formatMenuItem('rate_limit', 'Rate Limit Exceeded'),
      '  {gray-fg}Too many requests per minute{/gray-fg}',
      '',
      this.formatMenuItem('model_overloaded', 'Model Overloaded'),
      '  {gray-fg}Service unavailable due to high load{/gray-fg}',
      '',
      this.formatMenuItem('timeout', 'Request Timeout'),
      '  {gray-fg}Model took too long to respond{/gray-fg}',
      '',
      this.formatMenuItem('context_length_exceeded', 'Context Length Exceeded'),
      '  {gray-fg}Messages exceed maximum token limit{/gray-fg}',
      '',
      this.formatMenuItem('invalid_request', 'Invalid Request Error'),
      '  {gray-fg}Malformed request parameters{/gray-fg}',
      '',
      this.formatMenuItem('authentication_error', 'Authentication Error'),
      '  {gray-fg}Invalid API key or credentials{/gray-fg}',
      '',
      '',
      '{center}{gray-fg}Press Enter to select, Escape to cancel{/gray-fg}{/center}'
    ];

    this.menu.setItems(items);

    // Handle selection
    this.menu.on('select', (_, index) => {
      // Map index to error types (accounting for formatting lines)
      const errorTypeMap: Record<number, ErrorSimulationType> = {
        2: 'none',
        6: 'safety_content_filter',
        9: 'rate_limit',
        12: 'model_overloaded',
        15: 'timeout',
        18: 'context_length_exceeded',
        21: 'invalid_request',
        24: 'authentication_error'
      };

      const selectedType = errorTypeMap[index];
      if (selectedType !== undefined) {
        if (selectedType === 'none') {
          this.errorSimulator.disable();
        } else {
          this.errorSimulator.enable(selectedType);
        }
        this.hide();
      }
    });

    // Handle escape
    this.menu.key(['escape', 'q'], () => {
      this.hide();
    });

    this.menu.focus();
    this.visible = true;
    this.screen.render();
  }

  /**
   * Format menu item with indicator if currently selected
   */
  private formatMenuItem(errorType: ErrorSimulationType, label: string): string {
    const currentType = this.errorSimulator.getCurrentErrorType();
    const indicator = currentType === errorType ? '{green-fg}●{/green-fg}' : '{gray-fg}○{/gray-fg}';
    return `${indicator} {cyan-fg}${label}{/cyan-fg}`;
  }

  /**
   * Hide the menu
   */
  hide(): void {
    if (!this.visible || !this.menu) return;

    this.menu.detach();
    this.menu.destroy();
    this.menu = null;
    this.visible = false;
    this.onClose();
    this.screen.render();
  }

  /**
   * Check if menu is visible
   */
  isVisible(): boolean {
    return this.visible;
  }
}
