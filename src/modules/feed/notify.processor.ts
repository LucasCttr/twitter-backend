import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { FeedService } from './feed.service';

@Processor('tweet-notify')
@Injectable()
export class NotifyProcessor {
  constructor(private readonly feedService: FeedService) {}

  @Process('notify')
  async handleNotify(job: Job) {
    const { tweet } = job.data;
    if (!tweet) return;
    // FeedService will deliver to connected clients (or update unread counters)
    await this.feedService.notifyNewTweets([{ id: tweet.id, createdAt: tweet.createdAt }]);
  }
}