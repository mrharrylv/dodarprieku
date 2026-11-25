export interface Email {
  readonly to: string
  readonly subject: string
  readonly text: string
  readonly html: string
}

export interface Mailer {
  readonly send: (email: Email) => Promise<void>
}
