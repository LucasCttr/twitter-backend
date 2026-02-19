import { PaginationDto } from "../../../utils/pagination.dto";

export class TweetFilterDto extends PaginationDto {
  content?: string;
  authorId?: string;
  parentId?: string;
  retweetOfId?: string;

}
