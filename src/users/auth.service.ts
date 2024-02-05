import { Injectable } from '@nestjs/common';
import { Response, Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { MoreThan, Repository } from 'typeorm';
import { compare, hash } from 'bcrypt';
import * as crypto from 'crypto';
import { User } from './users.entity';
import { CreateUserDto } from './dtos/createUsers.dto';
import { SigninUserDto } from './dtos/signinUsers.dto';
import {
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import Email from 'src/utils/email';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  createJWT(userId: number, jwtType: 'access' | 'refresh') {
    return this.jwtService.sign(
      { userId },
      {
        secret:
          jwtType === 'access'
            ? process.env.JWT_ACCESS_SECRET
            : process.env.JWT_REFRESH_SECRET,
        expiresIn:
          jwtType === 'access'
            ? process.env.JWT_ACCESS_EXPIRES_IN
            : process.env.JWT_REFRESH_EXPIRES_IN,
      },
    );
  }

  createAndSendCookies(
    accessToken: string,
    refreshToken: string,
    res: Response,
  ) {
    const cookieOptions = (tokenType: 'accessToken' | 'refreshToken') => {
      const expiresIn =
        tokenType === 'accessToken'
          ? parseInt(process.env.JWT_ACCESS_COOKIE_EXPIRES_IN || '0') / 60 / 24
          : parseInt(process.env.JWT_REFRESH_COOKIE_EXPIRES_IN || '0');

      return {
        expires: new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      };
    };
    res.cookie('accessToken', accessToken, cookieOptions('accessToken'));
    res.cookie('refreshToken', refreshToken, cookieOptions('refreshToken'));
  }

  hashPassword = async (password: string) => {
    return await hash(password, 10);
  };

  createCode() {
    const resetCode = crypto.randomBytes(32).toString('hex');
    const hashedCode = crypto
      .createHash('sha256')
      .update(resetCode)
      .digest('hex');
    const codeExpiry = new Date(Date.now() + 10 * 60 * 1000);
    return { resetCode, hashedCode, codeExpiry };
  }

  passowrdChangedAfter(tokenTimestamp: number, user: User) {
    if (user.passwordChangedAt) {
      const passwordTimestamp = +(
        user.passwordChangedAt.getTime() / 1000 -
        100
      ).toFixed(0);
      return passwordTimestamp > tokenTimestamp;
    }
    return false;
  }

  async signup(body: CreateUserDto) {
    body.password = await this.hashPassword(body.password);
    const { resetCode, hashedCode, codeExpiry } = this.createCode();
    const verificationURL = `${process.env.FRONTEND_URL}/verify-email/${resetCode}`;
    const user = this.usersRepository.create({
      ...body,
      verificationToken: hashedCode,
      verificationTokenExpiry: codeExpiry,
    });
    try {
      await new Email(user, verificationURL).sendVerification();
    } catch (err) {
      throw new InternalServerErrorException(
        'There was an error sending the verification email. Try again later!',
      );
    }
    await this.usersRepository.save(user);
  }

  async verifyEmail(verificationToken: string) {
    const hashedVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');
    const user = await this.usersRepository.findOneBy({
      verificationToken: hashedVerificationToken,
      verificationTokenExpiry: MoreThan(new Date()),
    });
    if (!user) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }
    user.verified = true;
    user.verificationToken = null;
    user.verificationTokenExpiry = null;
    return await this.usersRepository.save(user);
  }

  async signin(body: SigninUserDto) {
    const user = await this.usersRepository.findOneBy({ email: body.email });
    if (!user || !(await compare(body.password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    } else if (!user.verified) {
      throw new UnauthorizedException('Email not verified');
    }
    return user;
  }

  async forgotPassword(email: string) {
    const user = await this.usersRepository.findOneBy({ email });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const { resetCode, hashedCode, codeExpiry } = this.createCode();
    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetCode}`;
    try {
      await new Email(user, resetURL).sendPasswordReset();
    } catch (err) {
      throw new InternalServerErrorException(
        'There was an error sending the reset password email. Try again later!',
      );
    }
    await this.usersRepository.update(user.id, {
      passwordResetToken: hashedCode,
      passwordResetTokenExpiry: codeExpiry,
    });
  }

  async resetPassword(resetCode: string, newPassword: string) {
    const hashedResetCode = crypto
      .createHash('sha256')
      .update(resetCode)
      .digest('hex');
    const user = await this.usersRepository.findOneBy({
      passwordResetToken: hashedResetCode,
      passwordResetTokenExpiry: MoreThan(new Date()),
    });
    if (!user) {
      throw new UnauthorizedException('Invalid or expired reset code');
    }
    user.password = await this.hashPassword(newPassword);
    user.passwordResetToken = null;
    user.passwordResetTokenExpiry = null;
    await this.usersRepository.save(user);
  }

  async changePassword(
    oldPassword: string,
    newPassword: string,
    user: User,
    res: Response,
  ) {
    if (!(await compare(oldPassword, user.password))) {
      throw new UnauthorizedException('Invalid password');
    }
    user.password = await this.hashPassword(newPassword);
    user.passwordChangedAt = new Date();
    const accessToken = this.createJWT(user.id, 'access');
    await this.usersRepository.save(user);
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(
        Date.now() +
          parseInt(process.env.JWT_ACCESS_COOKIE_EXPIRES_IN || '0') * 60 * 1000,
      ),
    });
  }

  async refreshAcccessToken(refreshToken: string, res: Response) {
    const { userId } = this.jwtService.verify(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET,
    });
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const accessToken = this.createJWT(user.id, 'access');
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(
        Date.now() +
          parseInt(process.env.JWT_ACCESS_COOKIE_EXPIRES_IN || '0') * 60 * 1000,
      ),
    });
  }

  async googleLogin(req: Request & { user?: any }, res: Response) {
    if (!req.user) {
      throw new UnauthorizedException('Google login failed');
    }
    const user = await this.usersRepository.findOneBy({
      email: req.user.email,
    });
    if (!user) {
      const password = await this.hashPassword(
        crypto.randomBytes(32).toString('hex'),
      );
      const newUser = this.usersRepository.create({
        email: req.user.email,
        name: req.user.name,
        photo: req.user.photo,
        password,
      });
      await this.usersRepository.save(newUser);
      const accessToken = this.createJWT(newUser.id, 'access');
      const refreshToken = this.createJWT(newUser.id, 'refresh');
      this.createAndSendCookies(accessToken, refreshToken, res);
      return newUser;
    }
    const accessToken = this.createJWT(user.id, 'access');
    const refreshToken = this.createJWT(user.id, 'refresh');
    this.createAndSendCookies(accessToken, refreshToken, res);
    return user;
  }

  signout(res: Response) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
  }
}
