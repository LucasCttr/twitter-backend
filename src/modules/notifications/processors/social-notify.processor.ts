import { Processor, Process } from "@nestjs/bull";
import { Job } from "bull";
import { Injectable } from "@nestjs/common";
import { FeedGateway } from "../../feed/feed.gateway";
import { FollowNotifyDto } from '../dto/follow-notify.dto';
import { Like } from "@prisma/client";
import { LikeNotifyDto } from "../dto/like-notify.dto";

// Este processor maneja las notificaciones relacionadas con acciones sociales, como likes y follows. 
// Se encarga de procesar los trabajos en la cola "social-notify" y emitir eventos a través del FeedGateway para notificar a los usuarios en tiempo real sobre estas interacciones.
@Processor("social-notify")
export class SocialNotifyProcessor {
  constructor(private readonly feedGateway: FeedGateway) {}

  // Procesa las notificaciones de like, emitiendo un evento al usuario receptor para informarle que su tweet ha sido gustado por otro usuario.
  @Process("like-notify")
  async handleLikeNotify(job: Job<LikeNotifyDto>) {
    const { userId, tweetId, likerId } = job.data;
    console.log(
      `Procesando notificación de like para usuario ${userId} en el tweet ${tweetId} por el usuario ${likerId}`,
    );
    this.feedGateway.emitToUser(userId, "likeNotification", {
      tweetId,
      likerId,
      message: "Your tweet was liked by user " + likerId,
    });
  }

  // Procesa las notificaciones de follow, emitiendo un evento al usuario receptor para informarle que ha sido seguido por otro usuario.
  @Process("follow-notify")
  async handleFollowNotify(job: Job<FollowNotifyDto>) {
    const { userId, followerId } = job.data;
    console.log(
      `Procesando notificación de follow para usuario ${userId} por el usuario ${followerId}`,
    );
    this.feedGateway.emitToUser(userId, "followNotification", {
      followerId,
      message: "You were followed by user " + followerId,
    });
  }
}
