import { useTranslation } from 'react-i18next'

import { HA_GROUP_PROJECTS } from '@/config/site'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/ui/Icon'

/**
 * The footer's "Citi HA Group projekti" row: HA Group's other products, each
 * a small inline icon and its name. They open in a new tab, which the link
 * says to a screen reader. Inherits the footer's colours, like `DevelopedBy`.
 */
export const OtherProjects = ({ className }: { className?: string }) => {
  const { t } = useTranslation('common')

  return (
    <nav aria-label={t('a11y.projectsNavigation')} className={cn(className)}>
      <h2 className="text-(length:--text-sm) font-semibold uppercase tracking-wide text-(--text-muted)">
        {t('footer.projectsHeading')}
      </h2>
      <ul className="mt-3 flex flex-wrap gap-x-2 gap-y-1">
        {HA_GROUP_PROJECTS.map((project) => (
          <li key={project.id}>
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-(--radius-sm) px-2 text-(length:--text-sm) text-(--text-secondary) hover:text-(--text-accent)"
            >
              <Icon name={project.icon} />
              <span>{project.name}</span>
              <span className="sr-only">{t('a11y.opensInNewTab')}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
