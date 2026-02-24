import { Processor, Process } from "@nestjs/bull";
import { Job } from "bull";
import { Injectable } from "@nestjs/common";
import { FeedGateway } from "../../feed/feed.gateway";

// Este processor maneja las notificaciones relacionadas con acciones de tweets, como retweets y replies. 
// Se encarga de procesar los trabajos en la cola "tweet-notify" y emitir eventos a través del FeedGateway para notificar a los usuarios en tiempo real sobre estas interacciones.
@Processor("tweet-notify")
export class TweetNotifyProcessor {
  constructor(private readonly feedGateway: FeedGateway) {}

  // Procesa las notificaciones de retweet, emitiendo un evento al usuario receptor para informarle que su tweet ha sido retweeted por otro usuario.
  @Process("retweet-notify")
  async handleRetweetNotify(job: any) {
    const { userId, tweetId, likerId } = job.data;
    console.log(
      `Procesando notificación de retweet para usuario ${userId} en el tweet ${tweetId} por el usuario ${likerId}`,
    );
    this.feedGateway.emitToUser(userId, "retweetNotification", {
      tweetId,
      likerId,
      message: "Your tweet was retweeted by user " + likerId,
    });
  }

  // Procesa las notificaciones de reply, emitiendo un evento al usuario receptor para informarle que su tweet ha sido replied por otro usuario.
  @Process("reply-notify")
  async handleReplyNotify(job: any) {
    const { userId, tweetId, likerId } = job.data;
    console.log(
      `Procesando notificación de reply para usuario ${userId} en el tweet ${tweetId} por el usuario ${likerId}`,
    );
    this.feedGateway.emitToUser(userId, "replyNotification", {
      tweetId,
      likerId,
      message: "Your tweet was replied by user " + likerId,
    });
  }
}
