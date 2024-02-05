import {
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users.service';

export interface RequestWithCurrentUser extends Request {
  currentUser: any;
}

@Injectable()
export class CurrentUserInterceptor implements NestInterceptor {
  constructor(
    private UsersService: UsersService,
    private JwtService: JwtService,
  ) {}

  async intercept(ctx: ExecutionContext, next: CallHandler<any>): Promise<any> {
    const req: RequestWithCurrentUser = ctx.switchToHttp().getRequest();
    const accessToken = req.cookies['accessToken'];
    if (!accessToken) {
      return next.handle();
    }
    const decoded = this.JwtService.verify(accessToken, {
      secret: process.env.JWT_ACCESS_SECRET,
    });
    const userId = decoded?.['userId'];
    if (userId) {
      const user = await this.UsersService.findOne(userId);
      req.currentUser = user;
    }
    return next.handle();
  }
}
