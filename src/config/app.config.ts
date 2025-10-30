/**
 * Application Configuration
 */

export interface AppConfig {
  port: number;
  host: string;
  maxHistorySize: number;
}

export const DEFAULT_CONFIG: AppConfig = {
  port: parseInt(process.env.PORT || '8032'),
  host: process.env.HOST || '0.0.0.0',
  maxHistorySize: 100
};
