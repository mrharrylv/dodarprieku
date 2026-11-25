import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { VALUES } from '@/data/services'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { Seo } from '@/components/seo/Seo'
import { ActionPanel } from './ActionPanel'
import { Band } from './Band'
import { PageHead } from './PageHead'
import { NumberChip, Panel } from './Panel'

export const AboutPage = () => {
  const { t } = useTranslation('about')
  const { t: tc } = useTranslation('common')
  const { locale } = useLocale()

  return (
    <>
      <Seo
        title={t('meta.title')}
        description={t('meta.description')}
        path={ROUTES.about}
        locale={locale}
      />

      <PageHead
        label={tc('nav.about')}
        title={t('hero.title')}
        subtitle={t('hero.subtitle')}
      />

      <Band index={1} title={t('story.title')}>
        <Panel className="sm:p-7">
          {/* prose-page caps the measure at 44rem. History is the one thing on
              this site someone reads end to end, so it gets the narrow column
              even though the panel around it is wider. */}
          <div className="prose-page">
            <p>{t('story.body')}</p>
          </div>
        </Panel>
      </Band>

      <Band index={2} title={t('values.title')}>
        <ul className="overflow-hidden rounded-(--radius-lg) border border-(--border-subtle) bg-(--surface-raised)">
          {VALUES.map((key, index) => (
            <li
              key={key}
              className="flex gap-4 border-t border-(--border-subtle) p-5 first:border-t-0"
            >
              <NumberChip n={index + 1} />
              <div className="min-w-0">
                <h3 className="text-(length:--text-lg) text-(--text-primary)">
                  {t(`values.items.${key}.title`)}
                </h3>
                <p className="mt-1 text-(--text-secondary)">
                  {t(`values.items.${key}.body`)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Band>

      <Band>
        <ActionPanel
          title={t('cta.title')}
          body={t('cta.body')}
          action={t('cta.button')}
          to={localePath(ROUTES.contact, locale)}
        />
      </Band>
    </>
  )
}
