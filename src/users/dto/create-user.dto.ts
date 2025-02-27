import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateUserDto {
  @IsString()
  @MinLength(10)
  name: string;

  @IsString()
  @IsEmail()
  email: string;

  @IsString()
  @IsEmail()
  emailNotification: string;

  @IsString()
  @MinLength(6)
  @MaxLength(50)
  @Matches(/(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      "The password must have a Uppercase, lowercase letter and a number",
  })
  password: string;

  @IsString()
  @MinLength(8)
  cedula: string;
}
