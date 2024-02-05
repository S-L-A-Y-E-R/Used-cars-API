import {
  Body,
  Controller,
  Get,
  Param,
  Delete,
  Patch,
  Post,
  Res,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { UsersService } from './users.service';
import { AuthService } from './auth.service';
import { UpdateUserDto } from './dtos/updateUsers.dto';
import { UserDto } from './dtos/user.dto';
import { Serialize } from 'src/interceptors/serialize.interceptor';
import { CreateUserDto } from './dtos/createUsers.dto';
import { SigninUserDto } from './dtos/signinUsers.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { CurrentUser } from './decorators/create-user.decorator';
import { User } from './users.entity';
import { GoogleOAuthGuard } from './google/google-oauth.guard';

@Controller()
export class UsersController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService,
  ) {}

  @Post('auth/signup')
  @Serialize(UserDto)
  async signup(
    @Body() body: CreateUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.signup(body);
    const accessToken = this.authService.createJWT(user.id, 'access');
    const refreshToken = this.authService.createJWT(user.id, 'refresh');
    this.authService.createAndSendCookies(accessToken, refreshToken, res);
    return user;
  }

  @Post('auth/signin')
  @Serialize(UserDto)
  async signin(
    @Body() body: SigninUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.signin(body);
    const accessToken = this.authService.createJWT(user.id, 'access');
    const refreshToken = this.authService.createJWT(user.id, 'refresh');
    this.authService.createAndSendCookies(accessToken, refreshToken, res);
    return user;
  }

  @Post('auth/forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    await this.authService.forgotPassword(body.email);
    return {
      status: 'success',
      message: 'Password reset code sent to your email',
    };
  }

  @Post('auth/reset-password/:resetToken')
  async resetPassword(
    @Param('resetToken') resetToken: string,
    @Body() body: { password: string },
  ) {
    await this.authService.resetPassword(resetToken, body.password);
    return {
      status: 'success',
      message: 'Password reset successfully!',
    };
  }

  @UseGuards(AuthGuard)
  @Patch('auth/change-password')
  async changePassword(
    @Body() body: { oldPassword: string; newPassword: string },
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: User,
  ) {
    await this.authService.changePassword(
      body.oldPassword,
      body.newPassword,
      user,
      res,
    );
    return {
      status: 'success',
      message: 'Password changed successfully!',
    };
  }

  @Post('auth/refresh-token')
  async refreshToken(
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token found');
    }
    await this.authService.refreshAcccessToken(refreshToken, res);
    return {
      status: 'success',
      message: 'Token refreshed successfully!',
    };
  }

  @Get('auth/google')
  @UseGuards(GoogleOAuthGuard)
  async googleAuth(@Req() req: Request) {}

  @Get('auth/google/callback')
  @UseGuards(GoogleOAuthGuard)
  @Serialize(UserDto)
  googleAuthRedirect(
    @Req() req: Request & { user?: any },
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.googleLogin(req, res);
  }

  @UseGuards(AuthGuard)
  @Post('auth/signout')
  signout(@Res({ passthrough: true }) res: Response) {
    this.authService.signout(res);
    return null;
  }

  @UseGuards(AuthGuard)
  @Get()
  @Serialize(UserDto)
  async find() {
    return await this.usersService.find();
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  @Serialize(UserDto)
  async findOne(@Param('id') id: string) {
    return await this.usersService.findOne(parseInt(id, 10));
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  @Serialize(UserDto)
  async remove(@Param('id') id: string) {
    return {
      status: 'success',
      message: 'User deleted successfully!',
    };
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  @Serialize(UserDto)
  async update(@Param('id') id: string, @Body() body: UpdateUserDto) {
    return await this.usersService.update(parseInt(id, 10), body);
  }
}
