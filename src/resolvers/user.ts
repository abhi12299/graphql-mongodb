import { isAuth } from '../middleware/isAuth'
import { MyContext } from '../types'
import {
  Arg,
  Ctx,
  Field,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  UseMiddleware,
} from 'type-graphql'
import { User, UserModel } from '../entities/User'
import { generateAccessToken } from '../utils/accessTokenHelpers'

@ObjectType()
class FieldError {
  @Field()
  field: string

  @Field()
  message: string
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[]

  @Field(() => User, { nullable: true })
  user?: User

  @Field(() => String, { nullable: true })
  accessToken?: string
}

@Resolver(() => User)
export class UserResolver {
  @Mutation(() => UserResponse)
  async createUser(
    @Arg('username', () => String, { nullable: false })
    username: string,
    @Arg('password', () => String, { nullable: false })
    password: string,
  ): Promise<UserResponse> {
    const isUsernameTaken = await UserModel.exists({ username })
    if (isUsernameTaken) {
      return {
        errors: [
          { field: 'username', message: 'Username is not available' },
        ],
      }
    }

    const user = new UserModel({ username, password })
    await user.save()
    return { user, accessToken: generateAccessToken(user) }
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('username', () => String, { nullable: false })
    username: string,
    @Arg('password', () => String, { nullable: false })
    password: string,
  ): Promise<UserResponse> {
    const user = await UserModel.findOne({ username })
    if (!user) {
      return {
        errors: [
          { field: 'username', message: 'Username does not exist' },
        ],
      }
    }

    if (!(await user.validatePassword(password))) {
      return {
        errors: [
          { field: 'password', message: 'Incorrect password' },
        ],
      }
    }

    return { user, accessToken: generateAccessToken(user) }
  }

  @UseMiddleware(isAuth)
  @Query(() => User)
  async me(@Ctx() { req }: MyContext): Promise<User | null> {
    const { username } = req.user!
    return await UserModel.findOne({ username })
  }

  @UseMiddleware(isAuth)
  @Mutation(() => Boolean)
  async updatePassword(
    @Arg('password', () => String, { nullable: false })
    password: string,
    @Ctx() { req }: MyContext,
  ): Promise<boolean> {
    const { username } = req.user!

    const user = await UserModel.findOne({ username })
    if (!user) {
      return false
    }

    user.password = password
    await user.save()
    return true
  }
}
