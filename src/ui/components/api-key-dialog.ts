/**
 * API Key Input Dialog
 */

import blessed from 'blessed';
import { PassthroughManager } from '../../core/passthrough/passthrough-manager.js';

export class ApiKeyDialog {
  private dialog: blessed.Widgets.BoxElement | null = null;
  private input: blessed.Widgets.TextboxElement | null = null;
  private visible: boolean = false;

  constructor(
    private screen: blessed.Widgets.Screen,
    private passthroughManager: PassthroughManager,
    private onClose: () => void
  ) {}

  /**
   * Show the API key input dialog
   */
  show(): void {
    if (this.visible) return;

    // Create dialog box
    this.dialog = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '60%',
      height: 12,
      label: ' Set OpenAI API Key ',
      border: { type: 'line', fg: 'cyan' as unknown as number },
      style: {
        bg: 'black',
        fg: 'white',
        border: { fg: 'cyan' as unknown as number }
      },
      tags: true
    });

    // Add instructions
    const instructions = blessed.box({
      parent: this.dialog,
      top: 1,
      left: 2,
      width: '100%-4',
      height: 3,
      content: '{cyan-fg}Enter your OpenAI API key to enable passthrough mode:{/cyan-fg}\n{gray-fg}Your key will be stored in memory only (not saved to disk){/gray-fg}',
      tags: true,
      style: { bg: 'black', fg: 'white' }
    });

    // Create input field
    this.input = blessed.textbox({
      parent: this.dialog,
      top: 5,
      left: 2,
      width: '100%-4',
      height: 1,
      inputOnFocus: true,
      border: { type: 'line', fg: 'yellow' as unknown as number },
      style: {
        bg: 'black',
        fg: 'white',
        focus: { bg: 'black', fg: 'white', border: { fg: 'green' as unknown as number } }
      },
      censor: true // Hide characters (show as *)
    });

    // Add buttons help text
    const helpText = blessed.box({
      parent: this.dialog,
      bottom: 1,
      left: 2,
      width: '100%-4',
      height: 1,
      content: '{center}{yellow-fg}Enter{/yellow-fg}: Save  |  {yellow-fg}Escape{/yellow-fg}: Cancel{/center}',
      tags: true,
      style: { bg: 'black', fg: 'gray' }
    });

    // Handle enter (save)
    this.input.on('submit', (value: string) => {
      if (value && value.trim().length > 0) {
        // Set the API key
        process.env.OPENAI_API_KEY = value.trim();

        // Enable passthrough if key was set
        if (!this.passthroughManager.isEnabled()) {
          this.passthroughManager.toggle();
        }
      }
      this.hide();
    });

    // Handle escape (cancel)
    this.input.key(['escape', 'C-c'], () => {
      this.hide();
    });

    this.input.focus();
    this.visible = true;
    this.screen.render();
  }

  /**
   * Hide the dialog
   */
  hide(): void {
    if (!this.visible || !this.dialog) return;

    this.dialog.detach();
    this.dialog.destroy();
    this.dialog = null;
    this.input = null;
    this.visible = false;
    this.onClose();
    this.screen.render();
  }

  /**
   * Check if dialog is visible
   */
  isVisible(): boolean {
    return this.visible;
  }
}
