import type { ReactNode } from 'react'
import { lv } from '../i18n/lv'

/** The centred card the login and set-password pages share. */
export const AuthShell = ({ title, intro, children }: { readonly title: string; readonly intro: string; readonly children: ReactNode }) => (
  <main className="flex min-h-screen items-center justify-center px-4 py-10">
    <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 shadow-[var(--shadow-card)]">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-accent)]">
        {lv.app.name} · {lv.app.area}
      </p>
      <h1 className="mt-2 text-[length:var(--text-2xl)]">{title}</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{intro}</p>
      <div className="mt-6">{children}</div>
    </div>
  </main>
)

export const Notice = ({ tone, children }: { readonly tone: 'error' | 'info'; readonly children: ReactNode }) => (
  <p
    role={tone === 'error' ? 'alert' : 'status'}
    className={`mb-4 rounded-[var(--radius-md)] border p-3 text-sm font-medium ${
      tone === 'error'
        ? 'border-[var(--border-danger)] bg-[var(--surface-danger-soft)] text-[var(--text-danger)]'
        : 'border-[var(--border-accent-soft)] bg-[var(--surface-accent-soft)] text-[var(--text-primary)]'
    }`}
  >
    {children}
  </p>
)
