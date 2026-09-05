import { Field, InputType } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';

@InputType()
export class CreatePlanInput {
  @Field()
  name!: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => String)
  price!: number;

  @Field(() => String, { defaultValue: 'MONTH' })
  interval?: string;

  @Field(() => String, { nullable: true })
  stripePriceId?: string;

  @Field(() => String)
  features!: Prisma.InputJsonValue;
}

@InputType()
export class UpdatePlanInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  price?: number;

  @Field(() => String, { nullable: true })
  interval?: string;

  @Field(() => String, { nullable: true })
  stripePriceId?: string;

  @Field(() => String, { nullable: true })
  features?: Prisma.InputJsonValue;

  @Field({ nullable: true })
  isActive?: boolean;
}
