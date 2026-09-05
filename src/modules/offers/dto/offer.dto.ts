import { Field, InputType } from '@nestjs/graphql';
import { OfferType, OfferStatus, OfferAccess } from '@prisma/client';

@InputType()
export class CreateOfferInput {
  @Field()
  advertiserId!: string;

  @Field()
  name!: string;

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

  @Field({ nullable: true })
  icon?: string;

  @Field(() => [String], { nullable: true })
  trafficSources?: string[];

  @Field(() => OfferStatus, { defaultValue: 'PENDING' })
  status?: OfferStatus;

  @Field(() => OfferAccess, { defaultValue: 'PUBLIC' })
  access?: OfferAccess;

  @Field({ nullable: true })
  networkOfferId?: string;
}

@InputType()
export class UpdateOfferInput {
  @Field({ nullable: true })
  name?: string;

  @Field(() => OfferType, { nullable: true })
  type?: OfferType;

  @Field({ nullable: true })
  category?: string;

  @Field({ nullable: true })
  previewLink?: string;

  @Field({ nullable: true })
  trackingLink?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  icon?: string;

  @Field(() => [String], { nullable: true })
  trafficSources?: string[];

  @Field(() => OfferStatus, { nullable: true })
  status?: OfferStatus;

  @Field(() => OfferAccess, { nullable: true })
  access?: OfferAccess;

  @Field({ nullable: true })
  networkOfferId?: string;
}

@InputType()
export class ApproveOfferInput {
  @Field()
  offerId!: string;

  @Field({ defaultValue: true })
  approved?: boolean;
}
