import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class OverviewStats {
  @Field(() => Int)
  totalClicks!: number;

  @Field(() => Int)
  uniqueClicks!: number;

  @Field(() => Int)
  conversions!: number;

  /** Conversion rate = conversions / uniqueClicks * 100, rounded to 2dp. */
  @Field()
  conversionRate!: string;

  @Field()
  pendingPayout!: string;

  @Field()
  totalSpent!: string;
}
