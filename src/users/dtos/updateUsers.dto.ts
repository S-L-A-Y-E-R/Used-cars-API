import { IsString, IsEmail, MinLength, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  readonly name: string;

  @IsString()
  @IsEmail()
  @IsOptional()
  readonly email: string;
}
