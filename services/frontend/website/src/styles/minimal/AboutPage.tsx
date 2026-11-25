import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { VALUES } from '@/data/services'
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
  Prose,
  RowBody,
  RowTitle,
  RuledItem,
  RuledList,
} from './Rhythm'

/**
 * About. The story is set at reading width and left to be read: no pull
 * quotes, no portrait grid, no numbers nobody can verify.
 */
export const AboutPage = () => {
  const { t } = useTranslation('about')
  const { locale } = useLocale()

  return (
    <>
      <Seo
        title={t('meta.title')}
        description={t('meta.description')}
        path={ROUTES.about}
        locale={locale}
      />

      <Page>
        <div>
          <PageTitle>{t('hero.title')}</PageTitle>
          <Lede>{t('hero.subtitle')}</Lede>
        </div>

        <Block>
          <BlockIntro title={t('story.title')} />
          <Prose>{t('story.body')}</Prose>
        </Block>

        <Block>
          <BlockIntro title={t('values.title')} />
          <RuledList>
            {VALUES.map((key, index) => (
              <RuledItem key={key}>
                <Marker index={index} />
                <RowTitle>{t(`values.items.${key}.title`)}</RowTitle>
                <RowBody>{t(`values.items.${key}.body`)}</RowBody>
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
