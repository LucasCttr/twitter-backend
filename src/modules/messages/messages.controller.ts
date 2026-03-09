import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guards';

@Controller('messages')
export class MessagesController {
	// Controlador placeholder para mensajes. Implementar endpoints cuando se necesite.
	@Get('')
	@UseGuards(JwtAuthGuard)
	list() {
		return { message: 'Endpoint de mensajes - pendiente de implementación' };
	}

	@Post('')
	@UseGuards(JwtAuthGuard)
	create() {
		return { message: 'Crear mensaje - pendiente' };
	}
}
