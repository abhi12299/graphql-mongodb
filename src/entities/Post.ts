import {
  getModelForClass,
  Index,
  prop as Property,
} from '@typegoose/typegoose'
import { ObjectId } from 'mongodb'
import { Field, ObjectType } from 'type-graphql'
import { User } from './User'

@ObjectType()
@Index({ createdAt: -1 })
export class Post {
  @Field(() => String)
  readonly _id: ObjectId

  @Field(() => String)
  @Property({
    required: true,
    // validate: {
    //   validator: (v) => v.length > 5,
    //   message: 'Title must be 5 chars long',
    // },
  })
  title: String

  @Property({
    required: true,
    ref: User,
    refPath: 'username',
  })
  authorUsername: string

  @Field(() => String)
  createdAt: Date

  @Field(() => String)
  updatedAt: Date

  // @Field(() => User)
  // author: User
}

export const PostModel = getModelForClass(Post, {
  schemaOptions: { timestamps: true },
})
