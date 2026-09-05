import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Notification {
  @Field(() => String)
  id!: string;

  @Field()
  title!: string;

  @Field()
  message!: string;

  @Field()
  type!: string;

  @Field()
  broadcast!: boolean;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
export class NotificationRead {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  notificationId!: string;

  @Field(() => String)
  userId!: string;

  @Field(() => Date, { nullable: true })
  readAt!: Date | null;
}

@ObjectType()
export class NotificationCount {
  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  unread!: number;
}
