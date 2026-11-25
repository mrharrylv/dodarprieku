import { Link } from 'react-router-dom'
import { lv } from '../i18n/lv'
import { PATHS } from '../paths'

export const NotFoundPage = () => (
  <div className="py-16 text-center">
    <h1 className="text-[length:var(--text-2xl)]">{lv.app.notFound}</h1>
    <Link to={PATHS.dashboard} className="mt-4 inline-flex min-h-11 items-center font-semibold text-[var(--text-accent)] underline">
      {lv.app.toHome}
    </Link>
  </div>
)
