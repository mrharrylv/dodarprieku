import type { ReactNode } from 'react'
import { afterEach, describe, it, expect, beforeEach, vi } from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'

import i18n from '@/i18n'
import { ThemeProvider } from '@/context/ThemeProvider'
import { renderWithProviders } from '@/test/render'
import { RATE_LIMIT } from '@/config/constants'
import { STORAGE_KEYS } from '@/config/site'
import type { ContactResult } from '@/lib/contact'

/**
 * The form is the site's only transaction, so every failure mode earns a test.
 * The unhappy paths matter most: a form that silently does nothing, or spins
 * forever, loses the enquiry AND the customer.
 *
 * The transport is mocked rather than stubbed at `fetch`. `lib/contact.test.ts`
 * already proves the mapping from HTTP responses to `ContactResult`; what is
 * under test HERE is what the form does with each of those results. Mocking at
 * the seam also keeps the test off `vi.resetModules()`, which loads a second
 * copy of react-i18next and quietly breaks context lookups.
 */

const { mockSubmit, mockHasBackend } = vi.hoisted(() => ({
  mockSubmit: vi.fn<() => Promise<ContactResult>>(),
  mockHasBackend: vi.fn<() => boolean>(),
}))

vi.mock('@/lib/contact', () => ({ submitContactForm: mockSubmit }))

vi.mock('@/config/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/config/env')>()),
  hasContactBackend: mockHasBackend,
}))

const { ContactForm } = await import('./ContactForm')

const renderForm = () => renderWithProviders(<ContactForm />)

const fillValidForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(/your name/i), 'Jane Bērziņa')
  await user.type(screen.getByLabelText(/^email/i), 'jane@example.com')
  await user.type(screen.getByLabelText(/subject/i), 'A question')
  await user.type(screen.getByLabelText(/message/i), 'I would like to know more about this.')
  await user.click(screen.getByRole('checkbox'))
}

const send = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: /send message/i }))

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  window.localStorage.clear()
  mockSubmit.mockReset()
  mockHasBackend.mockReset()
  mockHasBackend.mockReturnValue(true)
})

describe('with no endpoint configured', () => {
  it('shows the fallback instead of a form that cannot work', () => {
    mockHasBackend.mockReturnValue(false)
    renderForm()

    // Rendering a submit button that can never succeed is worse than saying so.
    expect(screen.getByText(/not available right now/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /send message/i })).not.toBeInTheDocument()
  })
})

describe('in demo mode', () => {
  it('renders the form and says, under it, that messages are not delivered', () => {
    renderForm()

    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument()
    // Without this line a "Message sent" in demo mode is a lie to a real customer.
    expect(screen.getByText(/demo form/i)).toBeInTheDocument()
  })
})

/**
 * Every page is prerendered, so the form is on screen before React is. A form
 * that works then is a trap: text typed into it never reaches React's state
 * (submitting says the filled fields are empty), and a native submit sends
 * the visitor's details as a GET, in the URL, into history and logs.
 */
describe('before hydration', () => {
  const Providers = ({ children }: { children: ReactNode }) => (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/en/contact']}>{children}</MemoryRouter>
      </ThemeProvider>
    </I18nextProvider>
  )

  let container: HTMLElement = document.createElement('div')

  const prerendered = () => {
    container = document.createElement('div')
    container.innerHTML = renderToString(
      <Providers>
        <ContactForm />
      </Providers>,
    )
    document.body.appendChild(container)
    return container
  }

  afterEach(() => container.remove())

  it('is inert as prerendered: every field and the submit button are disabled', () => {
    const container = prerendered()

    const fieldset = container.querySelector('fieldset')
    expect(fieldset).toBeDisabled()
    for (const control of container.querySelectorAll('input, textarea, button')) {
      expect(control, control.outerHTML).toBeDisabled()
    }
  })

  it('can never submit as a GET, so the fields never reach the URL', () => {
    const container = prerendered()
    expect(container.querySelector('form')?.getAttribute('method')).toBe('post')
  })

  it('comes alive once React has taken over the markup', async () => {
    const container = prerendered()
    const onRecoverableError = vi.fn()

    await act(async () => {
      hydrateRoot(
        container,
        <Providers>
          <ContactForm />
        </Providers>,
        { onRecoverableError },
      )
    })

    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(container.querySelector('fieldset')).toBeEnabled()
    expect(container.querySelector('button[type="submit"]')).toBeEnabled()
  })

  it('is usable from the first frame when React renders it fresh', () => {
    renderForm()
    expect(screen.getByRole('button', { name: /send message/i })).toBeEnabled()
    expect(screen.getByLabelText(/your name/i)).toBeEnabled()
  })
})

describe('validation', () => {
  it('does not submit an empty form, and reports every problem at once', async () => {
    const user = userEvent.setup()
    renderForm()

    await send(user)

    expect(mockSubmit).not.toHaveBeenCalled()

    // One error at a time, fixed one at a time, is how people give up.
    expect(await screen.findByText(/please tell us your name/i)).toBeInTheDocument()
    expect(screen.getByText(/we need an email address/i)).toBeInTheDocument()
    expect(screen.getByText(/give the message a subject/i)).toBeInTheDocument()
    expect(screen.getByText(/please write your message/i)).toBeInTheDocument()
    expect(screen.getByText(/need your agreement/i)).toBeInTheDocument()
  })

  it('ties each error to its field for a screen reader', async () => {
    const user = userEvent.setup()
    renderForm()

    await send(user)
    const name = await screen.findByLabelText(/your name/i)

    // A red border communicates nothing to someone who cannot see it.
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveAccessibleDescription(/please tell us your name/i)
  })

  it('clears a field error as soon as the field is corrected', async () => {
    const user = userEvent.setup()
    renderForm()

    await send(user)
    expect(await screen.findByText(/please tell us your name/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText(/your name/i), 'Jane')

    // A stale error under a field that has just been fixed reads as "still wrong".
    await waitFor(() => {
      expect(screen.queryByText(/please tell us your name/i)).not.toBeInTheDocument()
    })
  })

  it('lands focus on the first field that needs fixing', async () => {
    const user = userEvent.setup()
    renderForm()

    await send(user)
    await screen.findByText(/please tell us your name/i)

    // The accessible convention: put the visitor on the field to correct, not
    // on a summary they then have to navigate away from. It must also happen
    // in the same commit as the error render: moving focus later can yank it
    // away from someone who has already started typing.
    expect(screen.getByLabelText(/your name/i)).toHaveFocus()
  })

  it('does not steal focus once the visitor starts typing', async () => {
    const user = userEvent.setup()
    renderForm()

    await send(user)
    await screen.findByText(/please tell us your name/i)

    await user.type(screen.getByLabelText(/^email/i), 'jane@example.com')

    // Whatever the form did with focus after the failed submit is finished by
    // now; typing must not be interrupted mid-word.
    expect(screen.getByLabelText(/^email/i)).toHaveFocus()
    expect(screen.getByLabelText(/^email/i)).toHaveValue('jane@example.com')
  })

  it('requires the consent box to be ticked', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText(/your name/i), 'Jane Bērziņa')
    await user.type(screen.getByLabelText(/^email/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/subject/i), 'A question')
    await user.type(screen.getByLabelText(/message/i), 'I would like to know more about this.')
    await send(user)

    expect(mockSubmit).not.toHaveBeenCalled()
    expect(await screen.findByText(/need your agreement/i)).toBeInTheDocument()
  })

  it('ships the consent box unticked', () => {
    renderForm()

    // A pre-ticked box is not consent under GDPR Art. 4(11): Planet49, C-673/17.
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('links the privacy policy from inside the consent label', () => {
    renderForm()

    // The <1> tag in the locale string has to line up with the components
    // array, or the link silently renders as plain text: in every language.
    expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute(
      'href',
      expect.stringContaining('/legal/privacy'),
    )
  })
})

describe('a successful submission', () => {
  beforeEach(() => {
    mockSubmit.mockResolvedValue({ status: 'sent' })
  })

  it('confirms, and offers to send another', async () => {
    const user = userEvent.setup()
    renderForm()

    await fillValidForm(user)
    await send(user)

    expect(await screen.findByText(/message sent/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send another/i })).toBeInTheDocument()
  })

  it('does not spend the visitor’s rate-limit allowance', async () => {
    const user = userEvent.setup()
    renderForm()

    await fillValidForm(user)
    await send(user)
    await screen.findByText(/message sent/i)

    // Someone with two genuine enquiries must not be locked out after the first.
    expect(window.localStorage.getItem(STORAGE_KEYS.contactRateLimit)).toBeNull()
  })

  it('returns to an empty form when "send another" is pressed', async () => {
    const user = userEvent.setup()
    renderForm()

    await fillValidForm(user)
    await send(user)
    await user.click(await screen.findByRole('button', { name: /send another/i }))

    expect(await screen.findByLabelText(/your name/i)).toHaveValue('')
  })
})

describe('failure handling', () => {
  it.each([
    ['a network failure', { status: 'error', reason: 'network' }, /could not send the message/i],
    ['a timeout', { status: 'error', reason: 'timeout' }, /took too long/i],
    ['a server error', { status: 'error', reason: 'server' }, /wrong at our end/i],
    ['an unconfigured endpoint', { status: 'unavailable' }, /not available right now/i],
  ] as Array<[string, ContactResult, RegExp]>)(
    'explains %s in its own words',
    async (_label, result, message) => {
      const user = userEvent.setup()
      mockSubmit.mockResolvedValue(result)
      renderForm()

      await fillValidForm(user)
      await send(user)

      // A timeout is worth retrying; a 5xx is not. Saying which saves guessing.
      expect(await screen.findByText(message)).toBeInTheDocument()
    },
  )

  it('surfaces field errors the endpoint reports', async () => {
    const user = userEvent.setup()
    mockSubmit.mockResolvedValue({
      status: 'invalid',
      fields: { email: 'errors.email.invalid' },
    })
    renderForm()

    await fillValidForm(user)
    await send(user)

    expect(await screen.findByText(/does not look like an email address/i)).toBeInTheDocument()
  })

  it('re-enables the button after a failure so the visitor can retry', async () => {
    const user = userEvent.setup()
    mockSubmit.mockResolvedValue({ status: 'error', reason: 'network' })
    renderForm()

    await fillValidForm(user)
    await send(user)
    await screen.findByText(/could not send the message/i)

    // A button left disabled after an error is a dead end.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /send message/i })).toBeEnabled()
    })
  })

  it('keeps what was typed after a failure', async () => {
    const user = userEvent.setup()
    mockSubmit.mockResolvedValue({ status: 'error', reason: 'network' })
    renderForm()

    await fillValidForm(user)
    await send(user)
    await screen.findByText(/could not send the message/i)

    // Clearing the form on failure makes the visitor retype everything, which
    // is when they stop bothering.
    expect(screen.getByLabelText(/your name/i)).toHaveValue('Jane Bērziņa')
    expect(screen.getByLabelText(/message/i)).toHaveValue(
      'I would like to know more about this.',
    )
  })
})

describe('rate limiting', () => {
  it('blocks after the allowance is spent, and says how long to wait', async () => {
    const user = userEvent.setup()
    mockSubmit.mockResolvedValue({ status: 'sent' })

    window.localStorage.setItem(
      STORAGE_KEYS.contactRateLimit,
      JSON.stringify({
        attempts: Array.from({ length: RATE_LIMIT.maxAttempts }, () => Date.now()),
      }),
    )

    renderForm()
    await fillValidForm(user)
    await send(user)

    expect(await screen.findByText(/too many attempts/i)).toBeInTheDocument()
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('reports the endpoint’s own rate limit too', async () => {
    const user = userEvent.setup()
    mockSubmit.mockResolvedValue({ status: 'rate-limited', retryAfterSeconds: 180 })
    renderForm()

    await fillValidForm(user)
    await send(user)

    expect(await screen.findByText(/too many attempts/i)).toBeInTheDocument()
  })
})
