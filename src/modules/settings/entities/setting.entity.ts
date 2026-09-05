import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Setting {
  @Field(() => String)
  id!: string;

  @Field()
  key!: string;

  @Field(() => String)
  value!: any;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
