import type { AdminCharityDetail } from '@shared/contracts'
import { Row } from '../components/ProfileView'
import { Card } from '../components/ui'
import { lv } from '../i18n/lv'
import { formatDateTime, formatNumber, publicCharityUrl } from '../lib/format'

export const AccountCard = ({ charity: c }: { readonly charity: AdminCharityDetail }) => (
  <Card className="mb-4">
    <h2 className="text-[length:var(--text-lg)]">{lv.detail.account}</h2>
    <dl className="mt-2 grid divide-y divide-[var(--border-subtle)]">
      <Row label={lv.detail.accountEmail}>{c.accountEmail}</Row>
      <Row label={lv.charities.cols.passwordSet}>{c.passwordSet ? lv.charities.passwordYes : lv.charities.passwordNo}</Row>
      <Row label={lv.detail.created}>{formatDateTime(c.createdAt)}</Row>
      <Row label={lv.detail.updated}>{formatDateTime(c.updatedAt)}</Row>
      <Row label={lv.detail.stats}>
        {lv.charities.cols.views}: {formatNumber(c.views)} · {lv.charities.cols.pledges}: {formatNumber(c.pledges)}
      </Row>
      {c.status === 'approved' && (
        <Row label={lv.detail.publicPage}>
          <a href={publicCharityUrl(c.slug)} target="_blank" rel="noreferrer" className="break-all text-[var(--text-accent)] underline">
            {publicCharityUrl(c.slug)}
          </a>
        </Row>
      )}
      {c.rejectReason && <Row label={lv.detail.rejectReason}>{c.rejectReason}</Row>}
      {c.suspendReason && <Row label={lv.detail.suspendReason}>{c.suspendReason}</Row>}
    </dl>
  </Card>
)
