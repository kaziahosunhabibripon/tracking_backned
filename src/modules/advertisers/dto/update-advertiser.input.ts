import { Field, ID, InputType, PartialType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CreateAdvertiserInput } from './create-advertiser.input';
import { AdvertiserStatus } from '../enums/advertiser.enums';

@InputType()
export class UpdateAdvertiserInput extends PartialType(CreateAdvertiserInput) {
  @Field(() => ID)
  @IsUUID()
  id!: string;

  /** Status changes can come through a dedicated flow later (approval queue); for v1 it's just an enum patch. */
  @Field(() => AdvertiserStatus, { nullable: true })
  @IsOptional()
  @IsEnum(AdvertiserStatus)
  status?: AdvertiserStatus;
}
