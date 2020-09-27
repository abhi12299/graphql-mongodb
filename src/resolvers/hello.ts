import { CacheControl } from '../middleware/cacheControl'
import { Query, Resolver } from 'type-graphql'
import { CacheScope } from 'apollo-cache-control'

@Resolver()
export class HelloResolver {
  @Query(() => String)
  // cache the query for 10s
  // read more about public/private scope at https://www.apollographql.com/docs/apollo-server/performance/caching/#saving-full-responses-to-a-cache
  @CacheControl({ maxAge: 30, scope: CacheScope.Public })
  hello(): string {
    console.log('in resolver')
    return 'hello world!'
  }
}
