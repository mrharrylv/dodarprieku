/**
 * Every email the API sends, in Latvian. Values from users (names, reasons)
 * are passed through as text; render() escapes them for HTML.
 */
import { link, list, p, type Message } from './render'

const SIGN_OFF = 'Ar cieņu,\nDodar prieku komanda'

export interface Links {
  readonly publicOrigin: string
  readonly adminOrigin: string
  /** The address people can write back to, e.g. info@hagroup.lv. */
  readonly contactEmail: string
}

const q = encodeURIComponent

export const setPasswordUrl = (l: Links, token: string): string => `${l.publicOrigin}/konts/parole?token=${q(token)}`
export const resetPasswordUrl = (l: Links, token: string): string =>
  `${l.publicOrigin}/konts/parole?token=${q(token)}&reset=1`
export const adminSetPasswordUrl = (l: Links, token: string): string => `${l.adminOrigin}/parole?token=${q(token)}`
export const adminResetPasswordUrl = (l: Links, token: string): string =>
  `${l.adminOrigin}/parole?token=${q(token)}&reset=1`
export const charityPageUrl = (l: Links, slug: string): string => `${l.publicOrigin}/organizacija/${q(slug)}`
export const adminReviewUrl = (l: Links, id: string): string => `${l.adminOrigin}/pieteikumi/${q(id)}`

export const approvalEmail = (l: Links, orgName: string, token: string): Message => ({
  subject: 'Jūsu organizācija ir apstiprināta Dodar prieku kartē',
  blocks: [
    p('Labdien!'),
    p(`Paldies par pieteikumu. Organizācija “${orgName}” ir apstiprināta un tagad redzama Dodar prieku kartē.`),
    p('Lai pieslēgtos savam kontam, lūdzu, izveidojiet paroli šajā saitē. Saite ir derīga 7 dienas.'),
    link(setPasswordUrl(l, token)),
    p('Kontā redzēsiet, cik cilvēku ir apskatījuši jūsu lapu un ko viņi apsolījuši atnest. Tur varēsiet arī atjaunot vajadzību sarakstu.'),
    p(SIGN_OFF),
  ],
})

export const resetEmail = (url: string): Message => ({
  subject: 'Paroles atjaunošana Dodar prieku kontā',
  blocks: [
    p('Labdien!'),
    p('Saņēmām pieprasījumu atjaunot jūsu konta paroli. Jaunu paroli varat izveidot šajā saitē. Saite ir derīga 1 stundu.'),
    link(url),
    p('Ja paroli atjaunot nelūdzāt, šo vēstuli varat droši ignorēt. Jūsu pašreizējā parole paliek spēkā.'),
    p(SIGN_OFF),
  ],
})

export const adminInviteEmail = (l: Links, token: string): Message => ({
  subject: 'Uzaicinājums uz Dodar prieku administrācijas portālu',
  blocks: [
    p('Labdien!'),
    p('Jums ir izveidots Dodar prieku administratora konts. Lūdzu, izveidojiet paroli šajā saitē. Saite ir derīga 7 dienas.'),
    link(adminSetPasswordUrl(l, token)),
    p(SIGN_OFF),
  ],
})

export const updateApprovedEmail = (l: Links, orgName: string, slug: string): Message => ({
  subject: 'Jūsu profila izmaiņas ir publicētas',
  blocks: [
    p('Labdien!'),
    p(`Jūsu iesniegtās izmaiņas organizācijas “${orgName}” profilā ir apstiprinātas un jau redzamas kartē.`),
    link(charityPageUrl(l, slug)),
    p(SIGN_OFF),
  ],
})

const reasonBlocks = (reason: string | undefined) => (reason ? [p(`Iemesls: ${reason}`)] : [])

export const applicationRejectedEmail = (l: Links, orgName: string, reason?: string): Message => ({
  subject: 'Par jūsu pieteikumu Dodar prieku kartei',
  blocks: [
    p('Labdien!'),
    p(`Paldies par interesi. Diemžēl šoreiz nevaram apstiprināt organizācijas “${orgName}” pieteikumu.`),
    ...reasonBlocks(reason),
    p(`Ja jums ir jautājumi vai vēlaties pieteikties vēlreiz, rakstiet mums: ${l.contactEmail}`),
    p(SIGN_OFF),
  ],
})

export const updateRejectedEmail = (l: Links, orgName: string, reason?: string): Message => ({
  subject: 'Par jūsu profila izmaiņām',
  blocks: [
    p('Labdien!'),
    p(`Diemžēl nevarējām apstiprināt jūsu iesniegtās izmaiņas organizācijas “${orgName}” profilā. Kartē paliek redzams līdzšinējais profils.`),
    ...reasonBlocks(reason),
    p(`Izmaiņas varat iesniegt vēlreiz savā kontā. Ja jums ir jautājumi, rakstiet mums: ${l.contactEmail}`),
    p(SIGN_OFF),
  ],
})

export const pledgeThankYouEmail = (
  l: Links,
  orgName: string,
  slug: string,
  items: readonly string[],
  name?: string,
): Message => ({
  subject: 'Paldies, ka dodat prieku!',
  blocks: [
    p(name ? `Labdien, ${name}!` : 'Labdien!'),
    p(`Paldies, ka nolēmāt palīdzēt organizācijai “${orgName}”. Jūs apsolījāt atnest:`),
    list(items),
    p('Kā un kur ziedojumu nodot, skatiet organizācijas lapā:'),
    link(charityPageUrl(l, slug)),
    p('Jūsu palīdzība tiešām ir gaidīta.'),
    p(SIGN_OFF),
  ],
})

export const adminNewApplicationEmail = (l: Links, id: string, orgName: string, city: string): Message => ({
  subject: `Jauns pieteikums: ${orgName}`,
  blocks: [
    p(`Saņemts jauns pieteikums no organizācijas “${orgName}” (${city}).`),
    p('Pārskatīt to var administrācijas portālā:'),
    link(adminReviewUrl(l, id)),
  ],
})

export const adminNewUpdateEmail = (l: Links, id: string, orgName: string): Message => ({
  subject: `Profila izmaiņas: ${orgName}`,
  blocks: [
    p(`Organizācija “${orgName}” iesniedza profila izmaiņas, kas gaida apstiprinājumu.`),
    p('Pārskatīt tās var administrācijas portālā:'),
    link(adminReviewUrl(l, id)),
  ],
})
