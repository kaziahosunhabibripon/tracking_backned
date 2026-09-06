import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Faq {
  @Field(() => String)
  id!: string;

  @Field()
  question!: string;

  @Field()
  answer!: string;

  @Field({ nullable: true })
  category?: string;

  @Field(() => Number)
  sortOrder!: number;

  @Field()
  isPublished!: boolean;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
