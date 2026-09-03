import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AdvertiserStatus } from '../enums/advertiser.enums';

@InputType()
export class AdvertiserFilterInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => AdvertiserStatus, { nullable: true })
  @IsOptional()
  @IsEnum(AdvertiserStatus)
  status?: AdvertiserStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  managerId?: string;
}
