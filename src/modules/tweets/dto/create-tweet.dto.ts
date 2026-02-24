import { IsOptional, IsString, IsUUID, ValidateIf, IsNotEmpty } from 'class-validator';

export class CreateTweetDto {
  @IsString()
  @IsNotEmpty()
  content?: string;
  
}

