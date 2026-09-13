import { Field, InputType } from '@nestjs/graphql';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

@InputType()
export class CreateNotificationInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message!: string;

  @Field({ defaultValue: 'info' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  type?: string;

  @Field({ defaultValue: false })
  @IsOptional()
  @IsBoolean()
  broadcast?: boolean;

  /** Recipient for a personal (broadcast: false) notification. */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  userId?: string;
}

@InputType()
export class MarkNotificationReadInput {
  @Field(() => String)
  @IsUUID()
  notificationId!: string;
}
