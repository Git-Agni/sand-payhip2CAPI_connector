export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogFormat = 'pretty' | 'json';

export type LogMetadata = Record<string, unknown>;

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const parseLogLevel = (value: string | undefined): LogLevel => {
  if (
    value === 'debug' ||
    value === 'info' ||
    value === 'warn' ||
    value === 'error'
  ) {
    return value;
  }

  return 'info';
};

const parseLogFormat = (value: string | undefined): LogFormat =>
  value === 'json' ? 'json' : 'pretty';

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
  constructor(
    private readonly minimumLevel: LogLevel = parseLogLevel(
      process.env.LOG_LEVEL,
    ),
    private readonly format: LogFormat = parseLogFormat(process.env.LOG_FORMAT),
  ) {}

  debug(message: string, metadata?: LogMetadata): void {
    this.write('debug', message, metadata);
  }

  info(message: string, metadata?: LogMetadata): void {
    this.write('info', message, metadata);
  }

  warn(message: string, metadata?: LogMetadata): void {
    this.write('warn', message, metadata);
  }

  error(message: string, error?: unknown, metadata?: LogMetadata): void {
    this.write('error', message, {
      ...metadata,
      ...(error === undefined ? {} : { error: serializeError(error) }),
    });
  }

  private write(
    level: LogLevel,
    message: string,
    metadata?: LogMetadata,
  ): void {
    if (levelPriority[level] < levelPriority[this.minimumLevel]) {
      return;
    }

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(metadata && Object.keys(metadata).length > 0 ? { metadata } : {}),
    };

    const line =
      this.format === 'json'
        ? JSON.stringify(entry)
        : formatPrettyLogLine(entry);

    if (level === 'error') {
      console.error(line);
      return;
    }

    if (level === 'warn') {
      console.warn(line);
      return;
    }

    console.log(line);
  }
}

export const logger = new LoggingService();

function formatPrettyLogLine(entry: {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly message: string;
  readonly metadata?: LogMetadata;
}): string {
  const metadata =
    entry.metadata && Object.keys(entry.metadata).length > 0
      ? ` ${formatMetadata(entry.metadata)}`
      : '';

  return `${entry.timestamp} ${entry.level.toUpperCase()} ${entry.message}${metadata}`;
}

function formatMetadata(metadata: LogMetadata): string {
  return Object.entries(metadata)
    .map(([key, value]) => `${key}=${formatMetadataValue(value)}`)
    .join(' ');
}

function formatMetadataValue(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  if (value === undefined) {
    return 'undefined';
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (typeof value === 'string') {
    return value.includes(' ') ? JSON.stringify(value) : value;
  }

  return JSON.stringify(value);
}
