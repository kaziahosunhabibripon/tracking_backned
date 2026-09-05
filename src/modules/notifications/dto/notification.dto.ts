import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateNotificationInput {
  @Field()
  title!: string;

  @Field()
  message!: string;

  @Field({ defaultValue: 'info' })
  type?: string;

  @Field({ defaultValue: false })
  broadcast?: boolean;
}

@InputType()
export class MarkNotificationReadInput {
  @Field(() => String)
  notificationId!: string;
}
