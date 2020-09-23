import { ApolloServer } from 'apollo-server-express'
import 'dotenv-safe/config'
import express from 'express'
import { GraphQLError } from 'graphql'
import { ObjectId } from 'mongodb'
import mongoose from 'mongoose'
import 'reflect-metadata'
import { buildSchema } from 'type-graphql'
import { ErrorName } from './types'
import { HelloResolver } from './resolvers/hello'
import { PostResolver } from './resolvers/post'
import { UserResolver } from './resolvers/user'
import { ErrorResponse } from './types'
import { createUserLoader } from './utils/createUserLoader'
import { getErrorCode } from './utils/getErrorCode'
import { ObjectIdScalar } from './utils/objectIdScalar'
import { TypegooseMiddleware } from './utils/typegooseMiddleware'
import { jwtMiddleware } from './middleware/jwtMiddleware'

async function main() {
  await mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err)
    process.exit(1)
  })

  const app = express()
  app.use(jwtMiddleware)

  app.get('/', (_, res) => res.redirect('/graphql'))

  const schema = await buildSchema({
    resolvers: [HelloResolver, UserResolver, PostResolver],
    globalMiddlewares: [TypegooseMiddleware],
    validate: false,
    scalarsMap: [{ type: ObjectId, scalar: ObjectIdScalar }], // use ObjectId scalar mapping
  })
  const apolloServer = new ApolloServer({
    schema,
    tracing: false,
    playground: true,
    context: ({ req, res }) => ({
      req,
      res,
      userLoader: createUserLoader(),
    }),
    formatError: (err: GraphQLError): ErrorResponse => {
      console.error('Apollo server error:', err)
      let error: ErrorResponse
      if (
        typeof err.extensions?.exception.errorName !== 'undefined'
      ) {
        error = getErrorCode(
          err.extensions.exception.errorName as ErrorName,
        )
      } else {
        error = getErrorCode(ErrorName.INTERNAL_SERVER_ERROR)
      }
      return error
    },
  })

  apolloServer.applyMiddleware({ app })

  app.listen(process.env.PORT, () => {
    console.log(`> http://localhost:${process.env.PORT}`)
  })
}

main()
