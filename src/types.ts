import { Request, Response } from 'express'
import { createUserLoader } from './utils/createUserLoader'

export type MyContext = {
  req: Request & { user?: UserAuthTokenPayload }
  res: Response
  userLoader: ReturnType<typeof createUserLoader>
}

export type UserAuthTokenPayload = {
  username: string
}

export type ErrorResponse = {
  message: string
  code: number
}

export enum ErrorName {
  UNAUTHORIZED,
  INTERNAL_SERVER_ERROR,
}

export class CustomError extends Error {
  errorName: ErrorName

  constructor(name: ErrorName) {
    super('')
    this.errorName = name
  }
}
