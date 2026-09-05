import { Field, ObjectType } from '@nestjs/graphql';
import { OfferType, OfferStatus, OfferAccess } from '@prisma/client';

@ObjectType()
export class Offer {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  advertiserId!: string;

  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  slug?: string;

  @Field(() => OfferType)
  type!: OfferType;

  @Field()
  category!: string;

  @Field()
  previewLink!: string;

  @Field()
  trackingLink!: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  icon?: string;

  @Field(() => [String])
  trafficSources!: string[];

  @Field(() => OfferStatus)
  status!: OfferStatus;

  @Field(() => OfferAccess)
  access!: OfferAccess;

  @Field(() => String, { nullable: true })
  networkOfferId?: string;

  @Field(() => Date, { nullable: true })
  startDate?: Date;

  @Field(() => Date, { nullable: true })
  endDate?: Date;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
