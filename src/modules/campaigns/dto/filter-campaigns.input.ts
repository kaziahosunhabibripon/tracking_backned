import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CampaignStatus } from '../enums/campaign.enums';

@InputType()
export class CampaignFilterInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => CampaignStatus, { nullable: true })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  category?: string;
}
