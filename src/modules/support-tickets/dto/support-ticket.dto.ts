import { Field, InputType } from '@nestjs/graphql';
import { TicketPriority, TicketStatus } from '@prisma/client';

@InputType()
export class CreateSupportTicketInput {
  @Field()
  subject!: string;

  @Field()
  description!: string;

  @Field(() => TicketPriority, { defaultValue: 'MEDIUM' })
  priority?: TicketPriority;
}

@InputType()
export class UpdateSupportTicketInput {
  @Field(() => TicketPriority, { nullable: true })
  priority?: TicketPriority;

  @Field(() => TicketStatus, { nullable: true })
  status?: TicketStatus;

  @Field(() => String, { nullable: true })
  assigneeId?: string;
}
