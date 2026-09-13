import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { AffiliateStatus } from '../enums/affiliate.enums';

@InputType()
export class UpdateAffiliateStatusInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  affiliateId!: string;

  @Field(() => AffiliateStatus)
  @IsEnum(AffiliateStatus)
  status!: AffiliateStatus;
}
