/**
 * The Lambda entry, as a factory so the tests can hand it fakes. index.ts
 * wires the real AWS clients.
 */
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { createApp } from './app'
import type { Deps } from './deps'
import { fromEvent, toResponse } from './http/event'
import { errorFields, type Logger } from './log'
import { isTaskEvent, runTask, type TaskResult } from './tasks'

export type LambdaHandler = (event: unknown) => Promise<APIGatewayProxyStructuredResultV2 | TaskResult>

const isHttpEvent = (event: unknown): event is APIGatewayProxyEventV2 =>
  typeof event === 'object' &&
  event !== null &&
  'requestContext' in event &&
  typeof (event as { requestContext?: { http?: unknown } }).requestContext?.http === 'object'

const SERVER_ERROR: APIGatewayProxyStructuredResultV2 = toResponse({ status: 500, body: { ok: false, error: 'server' } })

export const createLambdaHandler = (getDeps: () => Promise<Deps>, log: Logger): LambdaHandler => async (event) => {
  let deps: Deps
  try {
    deps = await getDeps()
  } catch (err) {
    log.error('cold start failed', errorFields(err))
    return isHttpEvent(event) ? SERVER_ERROR : { ok: false, error: 'cold start failed' }
  }
  if (isHttpEvent(event)) return toResponse(await createApp(deps)(fromEvent(event)))
  if (isTaskEvent(event)) return runTask(deps, event as Readonly<Record<string, unknown>>)
  log.warn('unknown event shape')
  return { ok: false, error: 'unknown event' }
}
