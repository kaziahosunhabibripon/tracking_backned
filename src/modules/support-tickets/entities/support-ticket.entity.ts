import { Field, ObjectType } from '@nestjs/graphql';
import { TicketPriority, TicketStatus } from '@prisma/client';

@ObjectType()
export class SupportTicket {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  userId!: string;

  @Field()
  subject!: string;

  @Field()
  description!: string;

  @Field(() => TicketPriority)
  priority!: TicketPriority;

  @Field(() => TicketStatus)
  status!: TicketStatus;

  @Field(() => String, { nullable: true })
  assigneeId?: string;

  @Field(() => Date, { nullable: true })
  resolvedAt?: Date;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
