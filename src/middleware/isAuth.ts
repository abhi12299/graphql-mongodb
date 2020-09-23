import { CustomError, MyContext } from '../types'
import { MiddlewareFn } from 'type-graphql'
import { ErrorName } from '../types'

export const isAuth: MiddlewareFn<MyContext> = (
  { context },
  next,
) => {
  const { req } = context
  if (!req.user) {
    throw new CustomError(ErrorName.UNAUTHORIZED)
  }
  return next()
}
