import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { HIGHLIGHTS, SERVICES } from '@/data/services'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import {
  Actions,
  Block,
  BlockIntro,
  Eyebrow,
  Lede,
  Marker,
  Page,
  PageTitle,
  Prose,
  RowBody,
  RowLink,
  RowTitle,
  RuledItem,
  RuledList,
  TextLink,
  TextLinkRow,
} from './Rhythm'

/**
 * Home. Five blocks, one after the other, each starting at the same left edge
 * and separated by the same gap. No band changes colour and nothing sits in a
 * box: what tells a visitor a new subject has started is the space above it.
 */
export const HomePage = () => {
  const { t } = useTranslation('home')
  const { t: ts } = useTranslation('services')
  const { locale } = useLocale()

  const services = localePath(ROUTES.services, locale)

  return (
    <>
      <Seo
        title={t('meta.title')}
        description={t('meta.description')}
        path={ROUTES.home}
        locale={locale}
      />

      <Page>
        {/* The hero is type and one button. The page's only h1. */}
        <div>
          <Eyebrow>{t('hero.eyebrow')}</Eyebrow>
          <PageTitle hero>{t('hero.title')}</PageTitle>
          <Lede>{t('hero.subtitle')}</Lede>
          <Actions>
            {/* The one filled block on the page. Everything else is a text
                link, which is what keeps this obvious. */}
            <ButtonLink to={localePath(ROUTES.contact, locale)} size="lg">
              {t('hero.primaryCta')}
            </ButtonLink>
            <TextLink to={services}>{t('hero.secondaryCta')}</TextLink>
          </Actions>
        </div>

        <Block>
          <BlockIntro title={t('highlights.title')} subtitle={t('highlights.subtitle')} />
          <RuledList>
            {HIGHLIGHTS.map((key, index) => (
              <RuledItem key={key}>
                <Marker index={index} />
                <RowTitle>{t(`highlights.items.${key}.title`)}</RowTitle>
                <RowBody>{t(`highlights.items.${key}.body`)}</RowBody>
              </RuledItem>
            ))}
          </RuledList>
        </Block>

        <Block>
          <BlockIntro title={t('services.title')} subtitle={t('services.subtitle')} />
          <RuledList>
            {SERVICES.map((service) => (
              // The whole row is the link, so the row carries no padding of
              // its own and the link supplies it.
              <RuledItem key={service.key} flush>
                <RowLink to={`${services}#${service.slug}`}>
                  <RowTitle link>{ts(`items.${service.key}.title`)}</RowTitle>
                  <RowBody>{ts(`items.${service.key}.summary`)}</RowBody>
                </RowLink>
              </RuledItem>
            ))}
          </RuledList>
          <TextLinkRow>
            <TextLink to={services}>{t('services.cta')}</TextLink>
          </TextLinkRow>
        </Block>

        <Block>
          <BlockIntro title={t('about.title')} />
          <Prose>{t('about.body')}</Prose>
          <TextLinkRow>
            <TextLink to={localePath(ROUTES.about, locale)}>{t('about.cta')}</TextLink>
          </TextLinkRow>
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
