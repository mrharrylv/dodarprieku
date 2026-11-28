import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/register/RegisterPanel', () => ({ RegisterPanel: () => null }))
vi.mock('@/components/account/AccountDock', () => ({ AccountDock: () => null }))

import { loadAccountDock, loadRegisterPanel, preloadDock, preloadProps } from './dock-chunks'

describe('dock chunks', () => {
  it('fetches each chunk once and shares it with the lazy panel', async () => {
    expect(loadRegisterPanel()).toBe(loadRegisterPanel())
    expect(loadAccountDock()).toBe(loadAccountDock())
    expect(typeof (await loadRegisterPanel()).RegisterPanel).toBe('function')
  })

  it('preloads from hover, focus and touch, and never throws', async () => {
    const props = preloadProps('account')
    expect(Object.keys(props).sort()).toEqual(['onFocus', 'onPointerEnter', 'onTouchStart'])
    expect(() => props.onPointerEnter()).not.toThrow()
    expect(() => preloadDock('register')).not.toThrow()
    expect(typeof (await loadAccountDock()).AccountDock).toBe('function')
  })
})
