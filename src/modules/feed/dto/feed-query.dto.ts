import { IsOptional, IsString, IsInt, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class FeedQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take?: number = 20
}

export class FeedResponseDto<T extends { id: string }> {
  items: T[]
  nextCursor: string | null
  hasMore: boolean

  constructor(items: T[], take: number) {
    this.hasMore = items.length > take

    if (this.hasMore) {
      const nextItem = items.pop()
      this.nextCursor = nextItem!.id
    } else {
      this.nextCursor = null
    }

    this.items = items
  }
}