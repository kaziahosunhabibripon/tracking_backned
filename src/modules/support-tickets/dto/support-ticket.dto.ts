import { Field, InputType } from '@nestjs/graphql';
import { TicketPriority, TicketStatus } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

@InputType()
export class CreateSupportTicketInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description!: string;

  @Field(() => TicketPriority, { defaultValue: 'MEDIUM' })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}

@InputType()
export class UpdateSupportTicketInput {
  @Field(() => TicketPriority, { nullable: true })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @Field(() => TicketStatus, { nullable: true })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}
