import { useTranslation } from 'react-i18next'

import type { HaGroupProject } from '@/config/site'
import { cn } from '@/lib/cn'

/** A HA Group project's own logo, in a rounded square, from `public/projects/`. A `logoZoom` crops a logo's own margin. */
export const ProjectLogo = ({ project, size = 44, className }: { project: HaGroupProject; size?: number; className?: string }) => {
  const { t } = useTranslation('common')
  const zoom = 'logoZoom' in project ? project.logoZoom : 1
  return (
    <span
      className={cn('inline-block shrink-0 overflow-hidden rounded-(--radius-md) bg-(--surface-sunken) shadow-(--shadow-subtle)', className)}
      style={{ width: size, height: size }}
    >
      <img
        src={project.logo}
        alt={t('projects.logoAlt', { name: project.name })}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="h-full w-full object-cover"
        style={zoom === 1 ? undefined : { transform: `scale(${zoom})` }}
      />
    </span>
  )
}

/**
 * The other HA Group projects as cards: logo, name, one line, each opening
 * the project in a new tab (which the link tells a screen reader).
 */
export const ProjectCards = ({ projects, className }: { projects: readonly HaGroupProject[]; className?: string }) => {
  const { t } = useTranslation('common')
  return (
    <ul className={cn('grid gap-3', className)}>
      {projects.map((project) => (
        <li key={project.id}>
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex h-full items-start gap-3 rounded-(--radius-lg) border border-(--border-subtle) bg-(--surface-raised) p-3.5 shadow-(--shadow-subtle) transition-[border-color,box-shadow,transform] duration-200 ease-(--ease-out-soft) hover:-translate-y-0.5 hover:border-(--ring-accent) hover:shadow-(--shadow-card)"
          >
            <ProjectLogo project={project} />
            <span className="min-w-0">
              <span className="block font-semibold text-(--text-primary) group-hover:text-(--text-accent)">{project.name}</span>
              <span className="mt-0.5 block text-(length:--text-sm) leading-snug text-(--text-secondary)">{t(`projects.${project.id}`)}</span>
              <span className="mt-1 block text-(length:--text-xs) text-(--text-muted)">{new URL(project.url).host}</span>
              <span className="sr-only">{t('a11y.opensInNewTab')}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}
