import { Field, ID, ObjectType } from '@nestjs/graphql';
import { AdvertiserStatus, ContactMethod } from '../enums/advertiser.enums';

@ObjectType()
export class Advertiser {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  userId!: string;

  @Field()
  companyName!: string;

  @Field()
  phone!: string;

  @Field()
  country!: string;

  @Field(() => ID, { nullable: true })
  managerId!: string | null;

  @Field(() => ContactMethod, { nullable: true })
  contactMethod!: ContactMethod | null;

  @Field(() => String, { nullable: true })
  contactId!: string | null;

  @Field(() => String, { nullable: true })
  description!: string | null;

  /** Decimal(5,2) — exposed as a string so JS clients don't lose precision. */
  @Field(() => String, { nullable: true })
  commissionRate!: string | null;

  @Field(() => String, { nullable: true })
  payoutMethod!: string | null;

  @Field(() => String, { nullable: true })
  referralCode!: string | null;

  @Field(() => AdvertiserStatus)
  status!: AdvertiserStatus;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
