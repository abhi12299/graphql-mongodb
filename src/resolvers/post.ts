import { CacheScope } from 'apollo-cache-control'
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  InputType,
  Int,
  Mutation,
  ObjectType,
  PubSub,
  PubSubEngine,
  Query,
  Resolver,
  Root,
  Subscription,
  UseMiddleware,
} from 'type-graphql'
import { Post, PostModel } from '../entities/Post'
import { User } from '../entities/User'
import { CacheControl } from '../middleware/cacheControl'
import { isAuth } from '../middleware/isAuth'
import { MyContext } from '../types'

@InputType()
class PaginatedPostInput {
  @Field(() => Int)
  limit: number

  @Field(() => String, { nullable: true })
  cursor: string
}

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post], { nullable: false })
  @CacheControl({ maxAge: 30, scope: CacheScope.Private })
  posts: Post[]

  @Field()
  @CacheControl({ maxAge: 30, scope: CacheScope.Public })
  hasMore: boolean
}

@Resolver(() => Post)
export class PostResolver {
  @FieldResolver(() => User)
  @CacheControl({ maxAge: 30, scope: CacheScope.Public })
  async author(
    @Root() post: Post,
    @Ctx() { userLoader }: MyContext,
  ): Promise<User | undefined> {
    return await userLoader.load(post.authorUsername)
  }

  @UseMiddleware(isAuth)
  @Mutation(() => Post)
  async createPost(
    @Arg('title', () => String, { nullable: false }) title: string,
    @Ctx() { req }: MyContext,
    @PubSub() pubSub: PubSubEngine,
  ): Promise<Post> {
    const { username } = req.user!
    const p = new PostModel({
      authorUsername: username,
      title,
    })
    await p.save()
    await pubSub.publish('POST_ADDED', p.toJSON())
    return p
  }

  @Query(() => PaginatedPosts)
  // assuming posts query had some data
  // specific to the currently logged in user
  // private scope will cache query for every different user
  @CacheControl({ maxAge: 30, scope: CacheScope.Private })
  async posts(
    @Arg('opts', () => PaginatedPostInput, { nullable: false })
    { limit, cursor }: PaginatedPostInput,
  ): Promise<PaginatedPosts> {
    console.log('in posts resolver')
    const findQuery: any = {}
    if (cursor) {
      findQuery.createdAt = {
        $lt: cursor,
      }
    }
    const realLimit = Math.min(limit, 10)
    const realLimitPlusOne = realLimit + 1

    // Option 2 :- always aggregate and find related author
    // const posts = await PostModel.aggregate([
    //   { $match: findQuery },
    //   {
    //     $sort: { createdAt: -1 },
    //   },
    //   { $limit: realLimitPlusOne },
    //   {
    //     $lookup: {
    //       from: 'users',
    //       foreignField: 'username',
    //       localField: 'authorUsername',
    //       as: 'author',
    //     },
    //   },
    //   { $unwind: '$author' },
    // ])
    const posts = await PostModel.find(findQuery)
      .sort({
        createdAt: -1,
      })
      .limit(realLimitPlusOne)
      .lean()
    const hasMore = posts.length === realLimitPlusOne
    return {
      posts: posts.slice(0, realLimit),
      hasMore,
    }
  }

  // middleware runs when subscription is triggered
  @UseMiddleware(isAuth)
  @Subscription(() => Post, {
    topics: 'POST_ADDED',
    filter: ({ context }) => {
      // stop sending events to the client if not authenticated
      return !context.user
    },
  })
  newPost(@Root() post: Post): Post {
    return post
  }
}
