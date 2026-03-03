// src/modules/notifications/notifications.gateway.ts
import {
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { FeedService } from "../feed/feed.service";
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { Logger, Injectable } from '@nestjs/common';
import { verifyJwt } from '../../utils/jwt';

@WebSocketGateway({
  namespace: "/notifications",
  cors: { origin: true, credentials: true },
})
@Injectable()
export class NotificationsGateway implements OnGatewayConnection, OnGatewayInit, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger('NotificationsGateway');

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
      this.logger.log('Redis adapter enabled for notifications gateway');
    } catch (err) {
      this.logger.warn('Redis adapter setup failed, running in single instance mode');
    }
    this.feedService.setGateway(this);
  }

  // Cada usuario tiene una room: user:<userId>
  async handleConnection(client: Socket) {
    try {
      this.logger.log(`[handleConnection] Nuevo intento de conexión: ${client.id}`);
      // Autenticación: extraer token de cookie o header
      let token: string | undefined;
      // Buscar en cookies
      if (client.handshake.headers.cookie) {
        const cookies = Object.fromEntries(
          client.handshake.headers.cookie.split(';').map(c => {
            const [k, ...v] = c.trim().split('=');
            return [k, decodeURIComponent(v.join('='))];
          })
        );
        token = cookies['accessToken'] || cookies['token'] || cookies['access_token'] || cookies['jwt'];
      }
      // Buscar en auth header si no está en cookie
      if (!token && client.handshake.headers.authorization) {
        const authHeader = client.handshake.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
          token = authHeader.slice(7);
        }
      }
      if (!token) {
        this.logger.warn(`[handleConnection] Socket ${client.id} missing auth token, disconnecting`);
        client.disconnect(true);
        return;
      }
      // Verificar token
      let payload: any;
      try {
        payload = verifyJwt(token);
      } catch (e) {
        this.logger.warn(`[handleConnection] Socket ${client.id} provided invalid token, disconnecting. Error: ${e}`);
        client.disconnect(true);
        return;
      }
      const userId = payload.sub || payload.id || payload.userId;
      if (!userId) {
        this.logger.warn(`[handleConnection] Socket ${client.id} token missing userId, disconnecting`);
        client.disconnect(true);
        return;
      }
      // Unir a la room del usuario
      await client.join(`user:${userId}`);
      // Guardar userId en el socket para limpieza posterior
      (client as any).userId = userId;
      this.logger.log(`[handleConnection] Socket ${client.id} connected as user ${userId}`);
    } catch (err) {
      this.logger.error(`[handleConnection] Error: ${err} | Stack: ${(err as Error)?.stack}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    // Limpiar la room del usuario si es necesario
    const userId = (client as any).userId;
    if (userId) {
      // Socket.IO rooms se limpian automáticamente al desconectar el socket
      this.logger.log(`Socket ${client.id} disconnected for user ${userId}`);
    } else {
      this.logger.log(`Socket ${client.id} disconnected (no userId)`);
    }
  }

  emitToUser(userId: string, event: string, payload: any) {
    this.logger.debug(`Emitiendo evento ${event} al usuario ${userId}`);
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}