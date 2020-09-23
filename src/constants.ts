import { ErrorName, ErrorResponse } from './types'

export const ErrorTypes: Record<ErrorName, ErrorResponse> = {
  [ErrorName.UNAUTHORIZED]: {
    message: 'Authentication required.',
    code: 401,
  },
  [ErrorName.INTERNAL_SERVER_ERROR]: {
    message: 'Something went wrong. Please try again later.',
    code: 500,
  },
}

export const __prod__ = process.env.NODE_ENV === 'production'
