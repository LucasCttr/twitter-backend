import { IsOptional, IsString, MinLength } from "class-validator";

export class UpdateUserDto {

  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  profileImage?: string; // URL o path de la imagen de perfil

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
