import { User } from 'src/entities/User'
import jwt from 'jsonwebtoken'
import { UserAuthTokenPayload } from '../types'
import { Request } from 'express'

export const generateAccessToken = (user: User): string => {
  const payload: UserAuthTokenPayload = {
    username: user.username,
  }
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '1h',
  })
}

export const verifyAccessToken = (
  token: string,
): UserAuthTokenPayload | undefined => {
  try {
    return jwt.verify(
      token,
      process.env.JWT_SECRET,
    ) as UserAuthTokenPayload
  } catch (error) {
    return
  }
}

export const getAccessTokenFromReq = (
  req: Request,
): string | null => {
  if (
    req.headers.authorization &&
    req.headers.authorization.split(' ')[0] === 'Bearer'
  ) {
    return req.headers.authorization.split(' ')[1]
  } else if (req.query && typeof req.query.token === 'string') {
    return req.query.token
  } else if (
    typeof req.headers.Authorization === 'string' &&
    req.headers.Authorization.split(' ')[0] === 'Bearer'
  ) {
    return req.headers.Authorization.split(' ')[1]
  }
  return null
}
