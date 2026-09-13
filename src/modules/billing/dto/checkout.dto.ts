import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

@InputType()
export class CreateCheckoutSessionInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  planId!: string;

  /** Where Stripe sends the browser back on a successful subscription. */
  @Field()
  @IsUrl({ require_tld: false })
  successUrl!: string;

  /** Where Stripe sends the browser back if the user abandons checkout. */
  @Field()
  @IsUrl({ require_tld: false })
  cancelUrl!: string;
}

@InputType()
export class CreateBillingPortalSessionInput {
  /** Where Stripe sends the browser back when the user leaves the portal. */
  @Field()
  @IsUrl({ require_tld: false })
  returnUrl!: string;
}
