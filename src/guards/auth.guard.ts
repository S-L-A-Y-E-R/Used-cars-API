import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Injectable } from '@nestjs/common';
import { AuthService } from 'src/users/auth.service';
import { UsersService } from 'src/users/users.service';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: Request = context.switchToHttp().getRequest();
    let accessToken: string | null = null;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      accessToken = req.headers.authorization.split(' ')[1];
    }
    if (!accessToken || accessToken === 'null') {
      return false;
    }
    const decoded = await this.jwtService.verify(accessToken, {
      secret: process.env.JWT_ACCESS_SECRET,
    });
    const userId = decoded?.['userId'];
    if (!userId) {
      return false;
    }
    const user = await this.usersService.findOne(userId);
    if (!user || this.authService.passowrdChangedAfter(decoded['iat'], user)) {
      return false;
    }
    return true;
  }
}
