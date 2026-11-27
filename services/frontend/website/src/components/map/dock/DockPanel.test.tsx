import { fireEvent, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { ConfirmPanel } from '@/components/profile-editor/ConfirmPanel'
import { renderWithProviders } from '@/test/render'
import { DockPanel } from './DockPanel'

const renderDock = (onClose: () => void, onCancel: () => void = vi.fn()) =>
  renderWithProviders(
    <DockPanel title="Konts" onClose={onClose} panelRef={createRef<HTMLElement>()}>
      <label>
        Nosaukums
        <input type="text" />
      </label>
      <label>
        Meklēt
        <input type="search" />
      </label>
      <textarea aria-label="Apraksts" />
      <ConfirmPanel title="Mainīt?" body="Zudīs." confirmLabel="Mainīt" cancelLabel="Atcelt" onConfirm={vi.fn()} onCancel={onCancel} />
    </DockPanel>,
  )

describe('DockPanel, Escape (MAP-06)', () => {
  it('closes on Escape from the dock itself', () => {
    const onClose = vi.fn()
    renderDock(onClose)
    fireEvent.keyDown(screen.getByRole('region', { name: 'Konts' }), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('stays open on Escape typed in a field, which is the field\'s to handle', () => {
    const onClose = vi.fn()
    renderDock(onClose)
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Nosaukums' }), { key: 'Escape' })
    fireEvent.keyDown(screen.getByRole('searchbox', { name: 'Meklēt' }), { key: 'Escape' })
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Apraksts' }), { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('lets Escape on a confirmation cancel only the confirmation', () => {
    const onClose = vi.fn()
    const onCancel = vi.fn()
    renderDock(onClose, onCancel)
    fireEvent.keyDown(screen.getByRole('alertdialog', { name: 'Mainīt?' }), { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
  })
})
