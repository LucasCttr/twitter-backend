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
    const { tweet, userId, lastSeen } = job.data;
    if (!tweet) return;

    console.log("Notificando a userId:", userId);

    // Calcula la cantidad de tweets no vistos
    const unreadCount = await this.feedService.getUnreadCount(userId, lastSeen);

    // Notifica solo la cantidad por socket
    this.feedService.notifyUnreadCount(userId, unreadCount);
  }
}