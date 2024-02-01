import { Body, Controller, Post } from '@nestjs/common';
import { CreateUserDto } from './users.dto';

@Controller('auth')
export class UsersController {
  @Post('signup')
  signup(@Body() body: CreateUserDto) {
    console.log(body);
  }
}
