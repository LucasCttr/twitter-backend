import { IsOptional, IsString, IsUUID } from 'class-validator';
import { CursorPaginationDto } from '../../../utils/cursor-pagination.dto';

export class TweetFilterDto extends CursorPaginationDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsUUID()
  authorId?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsUUID()
  retweetOfId?: string;
}
