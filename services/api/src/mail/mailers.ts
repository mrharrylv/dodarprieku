import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import type { Email, Mailer } from './types'

export const createSesMailer = (from: string, client: SESv2Client = new SESv2Client({})): Mailer => ({
  send: async (email) => {
    await client.send(
      new SendEmailCommand({
        FromEmailAddress: from,
        Destination: { ToAddresses: [email.to] },
        Content: {
          Simple: {
            Subject: { Data: email.subject, Charset: 'UTF-8' },
            Body: { Text: { Data: email.text, Charset: 'UTF-8' }, Html: { Data: email.html, Charset: 'UTF-8' } },
          },
        },
      }),
    )
  },
})

export interface MemoryMailer extends Mailer {
  readonly sent: () => readonly Email[]
  /** Makes the next sends fail, to test that a mail failure loses nothing. */
  readonly failNext: (count?: number) => void
}

/** Keeps every email; `print` (the dev server) also writes it out so links can be clicked. */
export const createMemoryMailer = (print?: (email: Email) => void): MemoryMailer => {
  const sent: Email[] = []
  let failures = 0
  return {
    send: async (email) => {
      if (failures > 0) {
        failures -= 1
        throw new Error('mail failure (test)')
      }
      sent.push(email)
      print?.(email)
    },
    sent: () => [...sent],
    failNext: (count = 1) => {
      failures = count
    },
  }
}
