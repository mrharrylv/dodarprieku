import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { PROCESS_STEPS, SERVICES } from '@/data/services'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import {
  Actions,
  Block,
  BlockIntro,
  Lede,
  Marker,
  Page,
  PageTitle,
  RowBody,
  RowLede,
  RowTitle,
  RuledItem,
  RuledList,
} from './Rhythm'

/**
 * Services. A numbered list, read top to bottom, in the order the business
 * would say them out loud. Each entry is a number, a heading, the one-line
 * summary in full-strength ink and then the detail, which is as much structure
 * as four services need.
 */
export const ServicesPage = () => {
  const { t } = useTranslation('services')
  const { locale } = useLocale()

  return (
    <>
      <Seo
        title={t('meta.title')}
        description={t('meta.description')}
        path={ROUTES.services}
        locale={locale}
      />

      <Page>
        <div>
          <PageTitle>{t('hero.title')}</PageTitle>
          <Lede>{t('hero.subtitle')}</Lede>
        </div>

        <Block>
          <RuledList>
            {SERVICES.map((service, index) => (
              // The id is the anchor the home page links to, and the heading
              // is an h2 because this list has no block heading above it.
              <RuledItem key={service.key} id={service.slug}>
                <Marker index={index} />
                <RowTitle level={2}>{t(`items.${service.key}.title`)}</RowTitle>
                <RowLede>{t(`items.${service.key}.summary`)}</RowLede>
                <RowBody>{t(`items.${service.key}.body`)}</RowBody>
              </RuledItem>
            ))}
          </RuledList>
        </Block>

        <Block>
          <BlockIntro title={t('process.title')} />
          <RuledList ordered>
            {PROCESS_STEPS.map((step, index) => (
              <RuledItem key={step}>
                <Marker index={index} />
                <RowTitle>{t(`process.steps.${step}.title`)}</RowTitle>
                <RowBody>{t(`process.steps.${step}.body`)}</RowBody>
              </RuledItem>
            ))}
          </RuledList>
        </Block>

        <Block>
          <BlockIntro title={t('cta.title')} subtitle={t('cta.body')} />
          <Actions>
            <ButtonLink to={localePath(ROUTES.contact, locale)} size="lg">
              {t('cta.button')}
            </ButtonLink>
          </Actions>
        </Block>
      </Page>
    </>
  )
}
