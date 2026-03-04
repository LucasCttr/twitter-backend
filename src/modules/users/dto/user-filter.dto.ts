import { CursorPaginationDto } from "../../../utils/cursor-pagination.dto";

import { IsOptional, IsString } from 'class-validator';

export class UserFilterDto extends CursorPaginationDto {
    q?: string; // Búsqueda por nombre o email

    @IsOptional()
    @IsString()
    sort?: 'recent' | 'followers';
}
