import {
  DocumentType,
  getModelForClass,
  pre,
  prop as Property,
} from '@typegoose/typegoose'
import argon2 from 'argon2'
import { ObjectId } from 'mongodb'
import { Field, ObjectType } from 'type-graphql'

@ObjectType()
@pre<User>('save', async function () {
  if (!this.isModified('password')) {
    return
  }
  this.password = await argon2.hash(this.password)
})
export class User {
  @Field()
  readonly _id: ObjectId

  @Field(() => String)
  @Property({ required: true, unique: true, index: true })
  username: string

  @Property({ required: true })
  password!: string

  public async validatePassword(
    this: DocumentType<User>,
    password: string,
  ): Promise<boolean> {
    return await argon2.verify(this.password, password)
  }
}

export const UserModel = getModelForClass(User, {
  schemaOptions: { timestamps: true },
})
