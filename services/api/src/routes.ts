/** The API table of doc/specs/dodarprieku.md, one line per endpoint. */
import type { RouteDef } from './http/context'
import { route, type Route } from './http/router'
import { getAccount, getAccountPledges, postListRequest, putAccountProfile } from './handlers/account'
import { UPLOAD_BODY_MAX, postApplication, postUpload } from './handlers/applications'
import { getMe, postForgot, postLogin, postLogout, postSetPassword } from './handlers/auth'
import { deleteAdminCharity, getAdminCharity, listAdminCharities, putAdminProfile } from './handlers/admin-charities'
import { listAdminPledges, listCharitySubscribers, listListRequests, listSubscribers, markListRequestDone } from './handlers/admin-lists'
import {
  approveCharity,
  approveUpdate,
  rejectCharity,
  rejectUpdate,
  restoreCharity,
  resendInvite,
  suspendCharity,
} from './handlers/admin-moderation'
import { getStats, postPledge, postSubscribe, postView } from './handlers/public'

const r = (spec: string, handle: RouteDef['handle'], maxBody?: number): Route<RouteDef> =>
  route(spec, maxBody === undefined ? { handle } : { handle, maxBody })

export const ROUTES: readonly Route<RouteDef>[] = [
  r('GET /charities/:id/stats', getStats),
  r('POST /charities/:id/view', postView),
  r('POST /charities/:id/pledges', postPledge),
  r('POST /subscribe', postSubscribe),
  r('POST /applications', postApplication),
  r('POST /uploads', postUpload, UPLOAD_BODY_MAX),

  r('POST /auth/login', postLogin),
  r('POST /auth/logout', postLogout),
  r('GET /auth/me', getMe),
  r('POST /auth/set-password', postSetPassword),
  r('POST /auth/forgot', postForgot),

  r('GET /account', getAccount),
  r('PUT /account/profile', putAccountProfile),
  r('GET /account/pledges', getAccountPledges),
  r('POST /account/list-request', postListRequest),

  r('GET /admin/charities', listAdminCharities),
  r('GET /admin/charities/:id', getAdminCharity),
  r('PUT /admin/charities/:id/profile', putAdminProfile),
  r('POST /admin/charities/:id/approve', approveCharity),
  r('POST /admin/charities/:id/reject', rejectCharity),
  r('POST /admin/charities/:id/suspend', suspendCharity),
  r('POST /admin/charities/:id/restore', restoreCharity),
  r('POST /admin/charities/:id/resend-invite', resendInvite),
  r('POST /admin/charities/:id/update/approve', approveUpdate),
  r('POST /admin/charities/:id/update/reject', rejectUpdate),
  r('DELETE /admin/charities/:id', deleteAdminCharity),
  r('GET /admin/subscribers', listSubscribers),
  r('GET /admin/charities/:id/subscribers', listCharitySubscribers),
  r('GET /admin/pledges', listAdminPledges),
  r('GET /admin/list-requests', listListRequests),
  r('POST /admin/list-requests/:charityId/:id/done', markListRequestDone),
]
