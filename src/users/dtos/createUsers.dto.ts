import { IsString, IsEmail, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  readonly name: string;

  @IsString()
  @IsEmail()
  readonly email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
