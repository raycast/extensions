export class Logger {
  private static isDevelopment =
    process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

  static log(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.log(`[Formatter] ${message}`, ...args);
    }
  }

  static error(message: string, error?: Error | unknown): void {
    if (this.isDevelopment) {
      console.error(`[Formatter Error] ${message}`, error);
    }
  }

  static warn(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.warn(`[Formatter Warn] ${message}`, ...args);
    }
  }
}
