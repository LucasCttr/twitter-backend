import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { FeedGateway } from '../../feed/feed.gateway';

@Processor('retweet-notify')
export class RetweetNotifyProcessor {
  constructor(private readonly feedGateway: FeedGateway) {}

  @Process('retweet-notify')
  async handleRetweetNotify(job: any) {
    const { userId, tweetId, likerId } = job.data;
    console.log(`Procesando notificación de retweet para usuario ${userId} en el tweet ${tweetId} por el usuario ${likerId}`);
    this.feedGateway.emitToUser(userId, 'retweetNotification', {
      tweetId,
      likerId,
      message: 'Your tweet was retweeted by user ' + likerId,
    });
  }
}