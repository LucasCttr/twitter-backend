import { PaginationDto } from "../../../utils/pagination.dto";

export class UserFilterDto extends PaginationDto {
    username?: string;
    email?: string;
}
