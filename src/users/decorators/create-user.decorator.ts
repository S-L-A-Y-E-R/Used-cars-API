import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithCurrentUser } from '../interceptors/current-user.interceptor';

export const CurrentUser = createParamDecorator(
  (data: never, ctx: ExecutionContext) => {
    const req: RequestWithCurrentUser = ctx.switchToHttp().getRequest();
    return req.currentUser;
  },
);
