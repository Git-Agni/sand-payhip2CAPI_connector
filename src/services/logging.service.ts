export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogMetadata = Record<string, unknown>;

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const parseLogLevel = (value: string | undefined): LogLevel => {
  if (value === "debug" || value === "info" || value === "warn" || value === "error") {
    return value;
  }

  return "info";
};

const serializeError = (error: unknown): LogMetadata => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { error };
};

export class LoggingService {
  constructor(private readonly minimumLevel: LogLevel = parseLogLevel(process.env.LOG_LEVEL)) {}

  debug(message: string, metadata?: LogMetadata): void {
    this.write("debug", message, metadata);
  }

  info(message: string, metadata?: LogMetadata): void {
    this.write("info", message, metadata);
  }

  warn(message: string, metadata?: LogMetadata): void {
    this.write("warn", message, metadata);
  }

  error(message: string, error?: unknown, metadata?: LogMetadata): void {
    this.write("error", message, {
      ...metadata,
      ...(error === undefined ? {} : { error: serializeError(error) }),
    });
  }

  private write(level: LogLevel, message: string, metadata?: LogMetadata): void {
    if (levelPriority[level] < levelPriority[this.minimumLevel]) {
      return;
    }

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(metadata && Object.keys(metadata).length > 0 ? { metadata } : {}),
    };

    const line = JSON.stringify(entry);

    if (level === "error") {
      console.error(line);
      return;
    }

    if (level === "warn") {
      console.warn(line);
      return;
    }

    console.log(line);
  }
}

export const logger = new LoggingService();
