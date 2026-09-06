import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class LoginLog {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  userId!: string;

  @Field()
  ip!: string;

  @Field({ nullable: true })
  userAgent?: string;

  @Field()
  success!: boolean;

  @Field({ nullable: true })
  failureReason?: string;

  @Field(() => Date)
  createdAt!: Date;
}
