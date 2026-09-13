import { Field, Int, ObjectType } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';

@ObjectType()
export class AuthPayload {
  @Field(() => String)
  accessToken!: string;

  /**
   * Never exposed as a GraphQL field — the refresh token only ever leaves
   * the server as the httpOnly cookie CookieService sets. This property
   * exists so the resolver can still hand the raw value to CookieService.
   */
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
