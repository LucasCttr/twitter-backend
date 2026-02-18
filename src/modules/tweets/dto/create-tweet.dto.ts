export class CreateTweetDto {
  content!: string;
  parentId?: string;
  retweetOfId?: string;
}