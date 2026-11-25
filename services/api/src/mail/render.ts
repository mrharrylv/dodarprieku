/**
 * One message, two renderings: plain text and simple HTML. Every value that
 * came from a user is escaped in the HTML; links are only ever ones the API
 * built itself.
 */
import type { Email } from './types'

export type Block =
  | { readonly kind: 'p'; readonly text: string }
  | { readonly kind: 'link'; readonly href: string }
  | { readonly kind: 'list'; readonly items: readonly string[] }

export interface Message {
  readonly subject: string
  readonly blocks: readonly Block[]
}

export const p = (text: string): Block => ({ kind: 'p', text })
export const link = (href: string): Block => ({ kind: 'link', href })
export const list = (items: readonly string[]): Block => ({ kind: 'list', items })

const ENTITIES: Readonly<Record<string, string>> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c)

const textBlock = (b: Block): string => {
  switch (b.kind) {
    case 'p':
      return b.text
    case 'link':
      return b.href
    case 'list':
      return b.items.map((i) => `- ${i}`).join('\n')
  }
}

const htmlBlock = (b: Block): string => {
  switch (b.kind) {
    case 'p':
      return `<p>${escapeHtml(b.text).replace(/\n/g, '<br>')}</p>`
    case 'link':
      return `<p><a href="${escapeHtml(b.href)}">${escapeHtml(b.href)}</a></p>`
    case 'list':
      return `<ul>${b.items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`
  }
}

export const render = (to: string, message: Message): Email => ({
  to,
  subject: message.subject,
  text: `${message.blocks.map(textBlock).join('\n\n')}\n`,
  html: [
    '<!doctype html><html lang="lv"><head><meta charset="utf-8"></head>',
    '<body style="font-family:Arial,sans-serif;line-height:1.5">',
    ...message.blocks.map(htmlBlock),
    '</body></html>',
  ].join(''),
})
