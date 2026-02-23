import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { FeedGateway } from '../../feed/feed.gateway';

@Processor('like-notify')
export class LikeNotifyProcessor {
  constructor(private readonly feedGateway: FeedGateway) {}

  @Process('like-notify')
  async handleLikeNotify(job: any) {
    const { userId, tweetId, likerId } = job.data;
    console.log(`Procesando notificación de like para usuario ${userId} en el tweet ${tweetId} por el usuario ${likerId}`);
    this.feedGateway.emitToUser(userId, 'likeNotification', {
      tweetId,
      likerId,
      message: 'Your tweet was liked by user ' + likerId,
    });
  }
}