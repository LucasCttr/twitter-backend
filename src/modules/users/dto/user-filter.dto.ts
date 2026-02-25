import { CursorPaginationDto } from "../../../utils/cursor-pagination.dto";

export class UserFilterDto extends CursorPaginationDto {
    name?: string;
    email?: string;
}
