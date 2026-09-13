import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface';

export const CurrentUser = createParamDecorator(
  (
    _data: unknown,
    context: ExecutionContext,
  ): AuthenticatedUser | undefined => {
    if (context.getType<GqlContextType>() === 'graphql') {
      const ctx = GqlExecutionContext.create(context).getContext<{
        req?: { user?: AuthenticatedUser };
      }>();
      return ctx.req?.user;
    }
    return context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>()
      .user;
  },
);
