// src/modules/feed/feed.gateway.ts
import {
  OnGatewayInit,
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { FeedService } from "./feed.service";
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

@WebSocketGateway({ namespace: "/feed" })
export class FeedGateway implements OnGatewayConnection, OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly feedService: FeedService) {}

  async afterInit() {
    // configure redis adapter when REDIS_URL is present
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    try {
      const pubClient = createClient({ url: redisUrl });
      await pubClient.connect();
      const subClient = pubClient.duplicate();
      await subClient.connect();
      this.server.adapter(createAdapter(pubClient, subClient));
    } catch (err) {
      // if adapter setup fails, proceed without it (single instance)
    }

    this.feedService.setGateway(this);
  }


  // Mapa para asociar userId con socketId
  private userSockets: Map<string, string> = new Map();

  handleConnection(client: Socket) {
    const userId = client.handshake.auth.userId as string; 
    console.log("Conexión recibida:", userId, client.id);
    if (userId) {
      this.userSockets.set(userId, client.id);
    }
    // connection handling (no logs)
  }


  emitToUser(userId: string, event: string, payload: any) {
  console.log(`Emitiendo evento ${event} al usuario ${userId} con payload:`, payload);
  const socketId = this.userSockets.get(userId);
  if (socketId) {
    this.server.to(socketId).emit(event, payload);
  }
}
}
