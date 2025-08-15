type LogLevel = 'info' | 'warn' | 'error';

interface LogData {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isEnabled = true;

  private async sendToServer(logData: LogData) {
    if (!this.isEnabled) return;
    
    try {
      await fetch('/api/debug-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData),
      });
    } catch (error) {
      // Fallback to console if server logging fails
      console.warn('[Logger] Failed to send log to server:', error);
    }
  }

  info(message: string, data?: any) {
    const logData = { level: 'info' as LogLevel, message, data };
    
    // Always log to console in development
    if (this.isDevelopment) {
      console.log(`[INFO] ${message}`, data);
    }
    
    // Send to server for Vercel logs
    this.sendToServer(logData);
  }

  warn(message: string, data?: any) {
    const logData = { level: 'warn' as LogLevel, message, data };
    
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, data);
    }
    
    this.sendToServer(logData);
  }

  error(message: string, data?: any) {
    const logData = { level: 'error' as LogLevel, message, data };
    
    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, data);
    }
    
    this.sendToServer(logData);
  }

  // Enable/disable logging
  enable() { this.isEnabled = true; }
  disable() { this.isEnabled = false; }
}

// Export a singleton instance
export const logger = new Logger();
