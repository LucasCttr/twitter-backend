import { CursorPaginationDto } from "../../../utils/cursor-pagination.dto";

import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class UserFilterDto extends CursorPaginationDto {
    q?: string; // Búsqueda por nombre o email

    @IsOptional()
    @IsString()
    sort?: 'recent' | 'followers';

    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    excludeFollowed?: boolean;
}
