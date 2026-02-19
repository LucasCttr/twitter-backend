import { PaginationDto } from "../../../utils/pagination.dto";

export class TweetFilterDto extends PaginationDto {
  content?: string;
  authorId?: string;
  parentId?: string;
  retweetOfId?: string;

  constructor(page = 1, limit = 10, content?: string, authorId?: string, parentId?: string, retweetOfId?: string) {
    super(page, limit);
    this.content = content;
    this.authorId = authorId;
    this.parentId = parentId;
    this.retweetOfId = retweetOfId;
  }
}
