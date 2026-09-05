import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PerformancePoint {
  @Field()
  date!: string;

  @Field()
  clicks!: number;

  @Field()
  conversions!: number;

  @Field()
  revenue!: string;

  @Field()
  payout!: string;
}
