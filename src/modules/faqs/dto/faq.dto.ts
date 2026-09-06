import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateFaqInput {
  @Field()
  question!: string;

  @Field()
  answer!: string;

  @Field({ nullable: true })
  category?: string;

  @Field(() => Number, { defaultValue: 0 })
  sortOrder?: number;

  @Field({ defaultValue: true })
  isPublished?: boolean;
}

@InputType()
export class UpdateFaqInput {
  @Field({ nullable: true })
  question?: string;

  @Field({ nullable: true })
  answer?: string;

  @Field({ nullable: true })
  category?: string;

  @Field(() => Number, { nullable: true })
  sortOrder?: number;

  @Field({ nullable: true })
  isPublished?: boolean;
}
