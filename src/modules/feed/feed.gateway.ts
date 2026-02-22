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

  // Map<socketId, lastSeenTweet>
  private clients: Map<string, { id: string; createdAt: string }> = new Map();

  // Mapa para asociar userId con socketId
  private userSockets: Map<string, string> = new Map();

  handleConnection(client: Socket) {
    const userId = client.handshake.auth.userId as string; // <-- Cambia aquí
    console.log("Conexión recibida:", userId, client.id);
    if (userId) {
      this.userSockets.set(userId, client.id);
    }
    // connection handling (no logs)
  }

  @SubscribeMessage("registerLastSeen")
  handleRegisterLastSeen(
    @MessageBody() data: { lastSeen: { id: string; createdAt: string } },
    @ConnectedSocket() client: Socket,
  ) {
    this.clients.set(client.id, data.lastSeen);
  }

  notifyNewTweets(newTweets: { id: string; createdAt: string }[]) {
    for (const [clientId, lastSeen] of this.clients.entries()) {
      const nuevos = newTweets.filter((tweet) => this.isNewer(tweet, lastSeen));
      if (nuevos.length > 0) {
        this.server.to(clientId).emit("newTweetsAvailable", { count: nuevos.length });
      }
    }
  }

  private isNewer(newTweet: { createdAt: string }, lastSeenTweet: { createdAt: string }): boolean {
    return new Date(newTweet.createdAt) > new Date(lastSeenTweet.createdAt);
  }

  emitToUser(userId: string, event: string, payload: any) {
    const socketId = this.userSockets.get(userId);
    console.log(`emitToUser: userId=${userId}, socketId=${socketId}, event=${event}`); // <-- Log
    if (socketId) {
      this.server.to(socketId).emit(event, payload);
    } else {
      console.log(`No se encontró socket para userId: ${userId}`);
    }
  }
}
