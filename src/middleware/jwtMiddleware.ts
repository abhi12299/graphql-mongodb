import { NextFunction, Request, Response } from 'express'
import {
  getAccessTokenFromReq,
  verifyAccessToken,
} from '../utils/accessTokenHelpers'

export const jwtMiddleware = (
  req: Request,
  _: Response,
  next: NextFunction,
) => {
  const token = getAccessTokenFromReq(req)

  if (token) {
    const authPayload = verifyAccessToken(token)
    if (authPayload) {
      ;(req as any).user = authPayload
    }
  }
  next()
}
