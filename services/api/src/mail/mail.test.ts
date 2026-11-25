import { beforeEach, describe, expect, it } from 'vitest'
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import { mockClient } from 'aws-sdk-client-mock'
import { createMemoryMailer, createSesMailer } from './mailers'
import { escapeHtml, link, list, p, render } from './render'
import * as t from './templates'

const LINKS: t.Links = {
  publicOrigin: 'https://dodarprieku.hagroup.lv',
  adminOrigin: 'https://admin.dodarprieku.hagroup.lv',
  contactEmail: 'info@hagroup.lv',
}

describe('render', () => {
  it('renders text and escaped HTML from the same blocks', () => {
    const e = render('a@b.lv', { subject: 'S', blocks: [p('Sveiki, <Jānis> & "co"\notrā rinda'), link('https://x.lv/?a=1&b=2'), list(['<i>', 'b'])] })
    expect(e.text).toBe('Sveiki, <Jānis> & "co"\notrā rinda\n\nhttps://x.lv/?a=1&b=2\n\n- <i>\n- b\n')
    expect(e.html).toContain('<p>Sveiki, &lt;Jānis&gt; &amp; &quot;co&quot;<br>otrā rinda</p>')
    expect(e.html).toContain('<a href="https://x.lv/?a=1&amp;b=2">')
    expect(e.html).toContain('<li>&lt;i&gt;</li>')
    expect(e.html).toContain('lang="lv"')
    expect(escapeHtml("it's")).toBe('it&#39;s')
  })
})

describe('templates', () => {
  const all = [
    t.approvalEmail(LINKS, 'Ķepa', 'tok/+'),
    t.resetEmail(t.resetPasswordUrl(LINKS, 'tok')),
    t.adminInviteEmail(LINKS, 'tok'),
    t.updateApprovedEmail(LINKS, 'Ķepa', 'kepa'),
    t.applicationRejectedEmail(LINKS, 'Ķepa', 'Nav dokumentu'),
    t.applicationRejectedEmail(LINKS, 'Ķepa'),
    t.updateRejectedEmail(LINKS, 'Ķepa', 'Neskaidrs'),
    t.updateRejectedEmail(LINKS, 'Ķepa'),
    t.pledgeThankYouEmail(LINKS, 'Ķepa', 'kepa', ['Barība'], 'Jānis'),
    t.pledgeThankYouEmail(LINKS, 'Ķepa', 'kepa', ['Barība']),
    t.adminNewApplicationEmail(LINKS, 'c1', 'Ķepa', 'Rīga'),
    t.adminNewUpdateEmail(LINKS, 'c1', 'Ķepa'),
  ]

  it('never contains an em dash', () => {
    for (const m of all) expect(JSON.stringify(m)).not.toContain('\u2014')
  })

  it('builds the links the spec names', () => {
    expect(t.setPasswordUrl(LINKS, 'a/b')).toBe('https://dodarprieku.hagroup.lv/konts/parole?token=a%2Fb')
    expect(t.resetPasswordUrl(LINKS, 'a')).toBe('https://dodarprieku.hagroup.lv/konts/parole?token=a&reset=1')
    expect(t.adminSetPasswordUrl(LINKS, 'a')).toBe('https://admin.dodarprieku.hagroup.lv/parole?token=a')
    expect(t.adminResetPasswordUrl(LINKS, 'a')).toBe('https://admin.dodarprieku.hagroup.lv/parole?token=a&reset=1')
    expect(t.adminReviewUrl(LINKS, 'c1')).toBe('https://admin.dodarprieku.hagroup.lv/pieteikumi/c1')
    expect(t.charityPageUrl(LINKS, 'kepa')).toBe('https://dodarprieku.hagroup.lv/organizacija/kepa')
  })

  it('includes reasons only when given, and greets by name', () => {
    expect(render('x', all[4]!).text).toContain('Iemesls: Nav dokumentu')
    expect(render('x', all[5]!).text).not.toContain('Iemesls')
    expect(render('x', all[6]!).text).toContain('Iemesls: Neskaidrs')
    expect(render('x', all[8]!).text).toMatch(/^Labdien, Jānis!/)
    expect(render('x', all[9]!).text).toMatch(/^Labdien!/)
    expect(render('x', all[2]!).text).toContain('https://admin.dodarprieku.hagroup.lv/parole?token=tok')
  })
})

const ses = mockClient(SESv2Client)
beforeEach(() => ses.reset())

describe('mailers', () => {
  it('sends through SES v2 from the configured address, text and HTML', async () => {
    ses.on(SendEmailCommand).resolves({ MessageId: 'm' })
    await createSesMailer('Dodar prieku <info@hagroup.lv>', new SESv2Client({ region: 'eu-north-1' })).send({
      to: 'a@b.lv', subject: 'S', text: 'T', html: '<p>H</p>',
    })
    expect(ses.commandCalls(SendEmailCommand)[0]!.args[0].input).toEqual({
      FromEmailAddress: 'Dodar prieku <info@hagroup.lv>',
      Destination: { ToAddresses: ['a@b.lv'] },
      Content: {
        Simple: {
          Subject: { Data: 'S', Charset: 'UTF-8' },
          Body: { Text: { Data: 'T', Charset: 'UTF-8' }, Html: { Data: '<p>H</p>', Charset: 'UTF-8' } },
        },
      },
    })
  })

  it('keeps and prints mail in memory, and can fail on demand', async () => {
    const printed: string[] = []
    const m = createMemoryMailer((e) => printed.push(e.to))
    m.failNext(1)
    await expect(m.send({ to: 'a', subject: '', text: '', html: '' })).rejects.toThrow()
    await m.send({ to: 'b', subject: '', text: '', html: '' })
    expect(m.sent().map((e) => e.to)).toEqual(['b'])
    expect(printed).toEqual(['b'])
  })
})
