import { Field, Int, ObjectType } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';

@ObjectType()
export class AuthPayload {
  @Field(() => String)
  accessToken!: string;

  @Field(() => String)
  refreshToken!: string;

  @Field(() => String)
  tokenType!: string;

  @Field(() => Int)
  expiresIn!: number;

  @Field(() => Int)
  refreshExpiresIn!: number;

  @Field(() => User)
  user!: User;
}
