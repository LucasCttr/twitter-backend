import 'dotenv/config'
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { ValidationPipe } from "@nestjs/common";
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import cookieParser from 'cookie-parser';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'log'] });
  app.use(cookieParser());
  const origin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  app.enableCors({ origin, credentials: true });

  // Register Socket.IO adapter so websockets use the same CORS/credentials
  const adapter = new IoAdapter(app);
  app.useWebSocketAdapter(adapter);

  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(3000);
  console.log('App running on http://localhost:3000');
}

bootstrap();