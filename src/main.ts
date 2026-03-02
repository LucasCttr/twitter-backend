import 'dotenv/config'
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { ValidationPipe } from "@nestjs/common";
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'log'], // Muestra errores y logs normales
  });
  app.useGlobalPipes(new ValidationPipe({transform: true}));
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(3000);
  console.log("App running on http://localhost:3000");
}

bootstrap();
