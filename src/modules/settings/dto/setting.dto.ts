import { Field, InputType } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';

@InputType()
export class UpsertSettingInput {
  @Field()
  key!: string;

  @Field(() => String)
  value!: Prisma.InputJsonValue;
}
