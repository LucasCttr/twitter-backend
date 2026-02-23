import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { FeedGateway } from '../../feed/feed.gateway';
import { FollowNotifyDto } from '../dto/follow-notify.dto';

@Processor('follow-notify')
export class FollowNotifyProcessor {
  constructor(private readonly feedGateway: FeedGateway) {}

  @Process('follow-notify')
  async handleFollowNotify(job: Job<FollowNotifyDto>) {
    const { userId, followerId } = job.data;
    console.log(`Procesando notificación de follow para usuario ${userId} por el usuario ${followerId}`);
    this.feedGateway.emitToUser(userId, 'followNotification', {
      followerId,
      message: 'You were followed by user ' + followerId,
    });
  }
}