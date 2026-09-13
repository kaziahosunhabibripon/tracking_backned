import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class SetUserActiveInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @Field()
  @IsBoolean()
  isActive!: boolean;
}
