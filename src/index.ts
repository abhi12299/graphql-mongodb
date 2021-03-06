import * as Sentry from '@sentry/node'
import '@sentry/tracing'
import { RedisCache } from 'apollo-server-cache-redis'
import { PluginDefinition } from 'apollo-server-core'
import { ApolloError, ApolloServer } from 'apollo-server-express'
import { ApolloServerPlugin } from 'apollo-server-plugin-base'
import responseCachePlugin from 'apollo-server-plugin-response-cache'
import 'dotenv-safe/config'
import express from 'express'
import { execute, GraphQLError, subscribe } from 'graphql'
import { RedisPubSub } from 'graphql-redis-subscriptions'
import { createServer } from 'http'
import Redis from 'ioredis'
import { ObjectId } from 'mongodb'
import mongoose from 'mongoose'
import 'reflect-metadata'
import { SubscriptionServer } from 'subscriptions-transport-ws'
import { buildSchema } from 'type-graphql'
import { __prod__ } from './constants'
import { jwtMiddleware } from './middleware/jwtMiddleware'
import { TypegooseMiddleware } from './middleware/typegooseMiddleware'
import { HelloResolver } from './resolvers/hello'
import { PostResolver } from './resolvers/post'
import { UserResolver } from './resolvers/user'
import { ErrorName, ErrorResponse } from './types'
import { createUserLoader } from './utils/createUserLoader'
import { getErrorCode } from './utils/getErrorCode'
import { ObjectIdScalar } from './utils/objectIdScalar'

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

  const redisOptions: Redis.RedisOptions = {
    host: process.env.REDIS_HOST,
    port: +process.env.REDIS_PORT,
    retryStrategy: (times) => Math.max(times * 100, 3000),
  }

  const schema = await buildSchema({
    resolvers: [HelloResolver, UserResolver, PostResolver],
    globalMiddlewares: [TypegooseMiddleware],
    validate: false,
    scalarsMap: [{ type: ObjectId, scalar: ObjectIdScalar }], // use ObjectId scalar mapping
    pubSub: new RedisPubSub({
      publisher: new Redis(redisOptions),
      subscriber: new Redis(redisOptions),
    }),
  })
  const serverPlugins: PluginDefinition[] = [
    responseCachePlugin({
      sessionId: (req) => {
        // allow different values to be cached for different users
        // for example, if we stored upvotes on a post by users
        // and served cached response (cache policy scope must be private)
        // read about cache policy scopes here: https://www.apollographql.com/docs/apollo-server/performance/caching/#saving-full-responses-to-a-cache
        // for the post for say 30s then for a user who hasn't upvoted a post
        // the cached query will reflect that
        // for another user who has upvoted the post will have diff cache value
        return req.context.req.user?.username || null
        // responses with cache policy private are
        // shared among sessions with same id
      },
    }) as ApolloServerPlugin,
  ]

  if (__prod__) {
    serverPlugins.push({
      requestDidStart(_) {
        /* Within this returned object, define functions that respond
       to request-specific lifecycle events. */
        return {
          didEncounterErrors(ctx) {
            // If we couldn't parse the operation, don't
            // do anything here
            if (!ctx.operation) {
              return
            }

            for (const err of ctx.errors) {
              // Only report internal server errors,
              // all errors extending ApolloError should be user-facing
              if (err instanceof ApolloError) {
                continue
              }

              // Add scoped report details and send to Sentry
              Sentry.withScope((scope) => {
                // Annotate whether failing operation was query/mutation/subscription
                scope.setTag('kind', ctx.operation?.operation || '')

                // Log query and variables as extras (make sure to strip out sensitive data!)
                scope.setExtra('query', ctx.request.query)
                scope.setExtra('variables', ctx.request.variables)

                if (err.path) {
                  // We can also add the path as breadcrumb
                  scope.addBreadcrumb({
                    category: 'query-path',
                    message: err.path.join(' > '),
                    level: Sentry.Severity.Debug,
                  })
                }

                const transactionId = ctx.request.http?.headers.get(
                  'x-transaction-id',
                )
                if (transactionId) {
                  scope.setTransactionName(transactionId)
                }

                Sentry.captureException(err)
              })
            }
          },
        }
      },
    })
  }
  const apolloServer = new ApolloServer({
    schema,
    tracing: false,
    playground: {
      settings: {
        'request.credentials': 'include',
      },
    },
    // cacheControl: true, // enable to debug cache control headers
    cache: new RedisCache(redisOptions),
    context: ({ req, res }) => ({
      req,
      res,
      userLoader: createUserLoader(),
    }),
    formatError: (err: GraphQLError): ErrorResponse => {
      console.error(
        'Apollo server error:',
        JSON.stringify(err, null, 2),
      )
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
    // enable sentry error reporting in prod
    plugins: serverPlugins,
  })

  apolloServer.applyMiddleware({ app })

  if (__prod__) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 1,
    })
    // trigger sentry transaction
    // more info here: https://docs.sentry.io/platforms/node/performance/
    // const transaction = Sentry.startTransaction({
    //   op: 'test',
    //   name: 'My First Test Transaction',
    // })

    // setTimeout(() => {
    //   try {
    //     foo()
    //   } catch (e) {
    //     Sentry.captureException(e)
    //   } finally {
    //     transaction.finish()
    //   }
    // }, 99)
  }

  const server = createServer(app)

  server.listen(+process.env.PORT, () => {
    console.log(`> http://localhost:${process.env.PORT}`)
    new SubscriptionServer(
      {
        execute,
        subscribe,
        schema,
        onConnect: (connectionParams: any, websocket: any) => {
          const { upgradeReq } = websocket
          upgradeReq.headers = connectionParams
          jwtMiddleware(upgradeReq, {} as any, () => {})
          // if all subscriptions require authentication
          const { user } = upgradeReq
          if (!user) {
            throw new Error('no auth token')
          }
          return {
            req: websocket.upgradeReq,
            userLoader: createUserLoader(),
          }
        },
      },
      {
        server,
        path: '/graphql',
      },
    )
  })
}

main()
