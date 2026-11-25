/**
 * Structured JSON log lines. Every line carries the request id. Callers pass
 * only what is safe: never a password, a token, a cookie or a whole email;
 * `maskEmail` exists for the last.
 */

export type LogLevel = 'info' | 'warn' | 'error'
export type LogFields = Readonly<Record<string, unknown>>
export type LogSink = (line: string) => void

export interface Logger {
  readonly info: (msg: string, fields?: LogFields) => void
  readonly warn: (msg: string, fields?: LogFields) => void
  readonly error: (msg: string, fields?: LogFields) => void
  readonly child: (fields: LogFields) => Logger
}

/** "a***@example.com": enough to tell two people apart in a log, not enough to write to them. */
export const maskEmail = (email: string): string => {
  const at = email.indexOf('@')
  if (at < 1) return '***'
  return `${email[0]}***${email.slice(at)}`
}

export const errorFields = (err: unknown): LogFields =>
  err instanceof Error ? { errorName: err.name, errorMessage: err.message } : { errorMessage: String(err) }

// eslint-disable-next-line no-console
const defaultSink: LogSink = (line) => console.log(line)

export const createLogger = (base: LogFields = {}, sink: LogSink = defaultSink): Logger => {
  const write = (level: LogLevel) => (msg: string, fields: LogFields = {}) => {
    sink(JSON.stringify({ level, time: new Date().toISOString(), msg, ...base, ...fields }))
  }
  return {
    info: write('info'),
    warn: write('warn'),
    error: write('error'),
    child: (fields) => createLogger({ ...base, ...fields }, sink),
  }
}

export const silentLogger: Logger = createLogger({}, () => undefined)
