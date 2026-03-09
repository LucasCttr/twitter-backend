import { Injectable } from '@nestjs/common';

@Injectable()
export class MessagesService {
	// Servicio placeholder para lógica de mensajería.
	// - Aquí se centralizaría la persistencia de mensajes, entrega en tiempo real
	//   (p. ej. mediante WebSockets) y la integración con la tabla/conversaciones.
	// - Actualmente no hay modelo de mensajes definido; al diseñarlo, añadir
	//   operaciones como: createMessage, getConversation, markRead, listConversations.
}
