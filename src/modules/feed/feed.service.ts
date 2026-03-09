import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { FeedResponseDto } from "./dto/feed-query.dto";
import { NotificationsGateway } from "../notifications/notifications.gateway";

@Injectable()
export class FeedService {
  // Servicio responsable del feed (timeline)
  // Actualmente actúa como punto de integración con el gateway de notificaciones.
  constructor(private readonly prisma: PrismaService) {}
  private gateway: NotificationsGateway | null = null;

  // Registrar el gateway de notificaciones para emitir eventos si es necesario
  setGateway(gateway: NotificationsGateway) {
    this.gateway = gateway;
  }

}
