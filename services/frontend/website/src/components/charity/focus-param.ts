/** `/?org=<slug>`: the map opens on that charity. Read by MapPage, written by "Rādīt kartē". */
export const FOCUS_PARAM = 'org'

/** `/organizacija/<slug>?vajadzibas=1`: the charity's card opens expanded. The copy-link button adds it. */
export const EXPAND_PARAM = 'vajadzibas'

/** `/registreties?pieprasit=<slug>`: the registration claims that imported charity, filled in from its profile. */
export const CLAIM_PARAM = 'pieprasit'
