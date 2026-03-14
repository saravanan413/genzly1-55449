type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  component?: string;
  userId?: string;
  chatId?: string;
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${Object.entries(context).map(([k, v]) => `${k}:${v}`).join(', ')}]` : '';
    return `[${timestamp}] [${level.toUpperCase()}]${contextStr} ${message}`;
  }
  
  private log(level: LogLevel, message: string, data?: unknown, context?: LogContext) {
    if (!this.isDevelopment && level === 'debug') return;
    
    const formattedMessage = this.formatMessage(level, message, context);
    
    // Use structured logging for production
    const logData = {
      level,
      message: formattedMessage,
      data: data || null,
      timestamp: new Date().toISOString(),
      context
    };

    switch (level) {
      case 'debug':
        if (this.isDevelopment) {
          // eslint-disable-next-line no-console
          console.log(formattedMessage, data || '');
        }
        break;
      case 'info':
        if (this.isDevelopment) {
          // eslint-disable-next-line no-console
          console.info(formattedMessage, data || '');
        } else {
          // In production, use structured logging service
          this.sendToLoggingService(logData);
        }
        break;
      case 'warn':
        if (this.isDevelopment) {
          // eslint-disable-next-line no-console
          console.warn(formattedMessage, data || '');
        } else {
          this.sendToLoggingService(logData);
        }
        break;
      case 'error':
        if (this.isDevelopment) {
          // eslint-disable-next-line no-console
          console.error(formattedMessage, data || '');
        } else {
          this.sendToLoggingService(logData);
        }
        break;
    }
  }

  private sendToLoggingService(logData: Record<string, unknown>) {
    // In production, send logs to external service
    // For now, we'll use a minimal console approach for critical errors
    if (logData.level === 'error') {
      // eslint-disable-next-line no-console
      console.error('Critical Error:', logData.message);
    }
  }
  
  debug(message: string, data?: unknown, context?: LogContext) {
    this.log('debug', message, data, context);
  }
  
  info(message: string, data?: unknown, context?: LogContext) {
    this.log('info', message, data, context);
  }
  
  warn(message: string, data?: unknown, context?: LogContext) {
    this.log('warn', message, data, context);
  }
  
  error(message: string, data?: unknown, context?: LogContext) {
    this.log('error', message, data, context);
  }

  // Disable console methods in production to prevent any leaks
  static disableConsoleInProduction() {
    if (import.meta.env.PROD) {
      const noop = () => {};
      // eslint-disable-next-line no-console
      console.log = noop;
      // eslint-disable-next-line no-console
      console.debug = noop;
      // Keep warn and error for critical production issues
    }
  }
}

export const logger = new Logger();

// Initialize console disabling for production
Logger.disableConsoleInProduction();
