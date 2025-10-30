/**
 * Main Server Entry Point
 */

import express from 'express';
import { DEFAULT_CONFIG } from './config/app.config.js';
import { StatsManager } from './core/stats/stats-manager.js';
import { RequestLogger } from './core/stats/request-logger.js';
import { PassthroughManager } from './core/passthrough/passthrough-manager.js';
import { ErrorSimulator } from './core/error-simulation/error-simulator.js';
import { CompletionHandler, ChatCompletionHandler, EmbeddingHandler } from './api/handlers/index.js';
import { createAPIRoutes } from './api/routes/api.routes.js';
import { createRequestLoggerMiddleware } from './api/middleware/request-logger.middleware.js';
import { createErrorHandlerMiddleware } from './api/middleware/error-handler.middleware.js';
import { Dashboard } from './ui/components/dashboard.js';

// Parse CLI arguments
function parseArgs(): { port?: number; host?: string; apiKey?: string } {
  const args = process.argv.slice(2);
  const parsed: { port?: number; host?: string; apiKey?: string } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if ((arg === '--port' || arg === '-p') && nextArg) {
      parsed.port = parseInt(nextArg);
      i++;
    } else if ((arg === '--host' || arg === '-h') && nextArg) {
      parsed.host = nextArg;
      i++;
    } else if ((arg === '--api-key' || arg === '-k') && nextArg) {
      parsed.apiKey = nextArg;
      i++;
    } else if (arg === '--help') {
      console.log(`
LLM Doctor - API Monitoring & Error Simulation Tool

Usage: llm-doctor [options]

Options:
  -p, --port <port>       Port to listen on (default: 8032)
  -h, --host <host>       Host to bind to (default: 0.0.0.0)
  -k, --api-key <key>     OpenAI API key for passthrough mode
  --help                  Show this help message

Examples:
  llm-doctor
  llm-doctor --port 3000
  llm-doctor --api-key sk-...
  npx llm-doctor --port 8080 --api-key sk-...

Controls:
  m       - Open error simulation menu
  p       - Toggle passthrough mode (requires API key)
  Tab     - Switch between panels
  q       - Quit (press twice)
  Ctrl+C  - Force quit
      `);
      process.exit(0);
    }
  }

  return parsed;
}

/**
 * Main Application Class
 */
class FakeVLLMServer {
  private app = express();
  private statsManager: StatsManager;
  private requestLogger: RequestLogger;
  private passthroughManager: PassthroughManager;
  private errorSimulator: ErrorSimulator;
  private dashboard: Dashboard;
  private config: { port: number; host: string };

  constructor(options: { port?: number; host?: string; apiKey?: string } = {}) {
    // Apply configuration
    this.config = {
      port: options.port || DEFAULT_CONFIG.port,
      host: options.host || DEFAULT_CONFIG.host
    };

    // Set API key if provided via CLI
    if (options.apiKey) {
      process.env.OPENAI_API_KEY = options.apiKey;
    }

    // Initialize core services
    this.statsManager = new StatsManager();
    this.requestLogger = new RequestLogger(DEFAULT_CONFIG.maxHistorySize);
    this.passthroughManager = new PassthroughManager();
    this.errorSimulator = new ErrorSimulator();

    // Initialize dashboard
    this.dashboard = new Dashboard(
      this.requestLogger,
      this.statsManager,
      this.passthroughManager,
      this.errorSimulator,
      this.config.host,
      this.config.port
    );

    this.setupServer();
  }

  /**
   * Setup Express server
   */
  private setupServer(): void {
    // Middleware
    this.app.use(express.json());
    this.app.use(
      createRequestLoggerMiddleware(this.requestLogger, this.statsManager)
    );

    // Initialize handlers
    const completionHandler = new CompletionHandler(this.passthroughManager, this.errorSimulator);
    const chatCompletionHandler = new ChatCompletionHandler(this.passthroughManager, this.errorSimulator);
    const embeddingHandler = new EmbeddingHandler(this.passthroughManager, this.errorSimulator);

    // Routes
    const apiRoutes = createAPIRoutes(
      completionHandler,
      chatCompletionHandler,
      embeddingHandler,
      this.requestLogger,
      this.statsManager
    );
    this.app.use(apiRoutes);

    // Error handler (must be last)
    this.app.use(createErrorHandlerMiddleware(this.statsManager));
  }

  /**
   * Start the server
   */
  start(): void {
    this.app.listen(this.config.port, this.config.host, () => {
      // Start dashboard after server is listening
      this.dashboard.start();
    });
  }
}

// Parse CLI args and start the server
const cliArgs = parseArgs();
const server = new FakeVLLMServer(cliArgs);
server.start();
