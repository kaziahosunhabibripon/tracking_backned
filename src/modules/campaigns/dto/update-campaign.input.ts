import { Field, ID, InputType, PartialType } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';
import { CreateCampaignInput } from './create-campaign.input';

@InputType()
export class UpdateCampaignInput extends PartialType(CreateCampaignInput) {
  @Field(() => ID)
  @IsUUID()
  id!: string;
}
