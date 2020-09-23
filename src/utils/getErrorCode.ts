import { ErrorTypes } from '../constants'
import { ErrorName } from '../types'

export const getErrorCode = (errorName: ErrorName) => {
  return ErrorTypes[errorName]
}
