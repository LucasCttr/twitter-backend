# Twitter-like Backend (Proyecto con fin de aprendizaje)

Resumen

- Backend estilo Twitter construido con NestJS y TypeScript. Implementa autenticación, publicación de tweets, likes, bookmarks, seguimientos, feed con paginación, y notificaciones en tiempo real via WebSockets.

Stack tecnológico

- Lenguaje: TypeScript
- Framework: NestJS (v11)
- ORM: Prisma
- Base de datos: PostgreSQL
- Cache / messaging: Redis (usado como adaptador de Socket.IO para notificaciones)
- WebSockets: Socket.IO + adaptador Redis
- Contenedores: Docker / docker-compose
- Otras: Passport (local + JWT), bcrypt, Zod, Axios, Cheerio

Características implementada

- Autenticación y autorización
  - Registro y login con contraseña hasheada (`bcrypt`)
  - Autenticación con JWT y refresh tokens
- Usuarios
  - Perfiles de usuario, imagen de perfil (campo en el modelo)
  - Seguir / dejar de seguir usuarios
- Tweets
  - Crear, listar y eliminar tweets
  - Likes y bookmarks (relaciones en la DB)
- Feed
  - Feed paginado por cursor (DTOs de paginación)
  - Endpoint para timeline y para obtener tweets de un usuario
- Notificaciones en tiempo real
  - Gateway WebSocket en `src/modules/notifications/notifications.gateway.ts`
  - Redis adapter para escalar el gateway entre instancias (si `REDIS_URL` está disponible)
- Mensajería privada (básica) mediante módulo `messages`
- Trending / métricas básicas
- Gestión de tareas en background (dependencia `@nestjs/bull` presente para jobs)
- Migraciones y modelos gestionados con Prisma (`prisma/schema.prisma` y `prisma/migrations`)

Arquitectura y organización del código

- Código organizado por módulos en `src/modules/` (ej.: `auth`, `users`, `tweets`, `feed`, `notifications`, `messages`, `trending`).
- `src/main.ts` y `src/app.module.ts` actúan como punto de entrada e inicialización de NestJS.
- `src/database/prisma.service.ts` encapsula el cliente de Prisma.
- DTOs y validaciones con `class-validator` y `class-transformer`.

Docker y despliegue local

- Servicios principales definidos en [docker-compose.yml](docker-compose.yml):
  - `db` (Postgres)
  - `redis` (Redis)
  - `backend` (esta aplicación)

Comandos comunes

- Levantar dependencias con Docker (Postgres + Redis):

```bash
docker-compose up -d db redis
```

- Instalar dependencias y correr en modo desarrollo:

```bash
npm install
npm run start:dev
```

- Migraciones y reset de DB con Prisma:

```bash
# Aplicar migraciones
npx prisma migrate deploy
# O en desarrollo
npx prisma migrate dev
# Resetear la base de datos (PELIGRO: borra todo)
npx prisma migrate reset --force
```

- Alternativa para resetar esquema usando el contenedor si corresponde:

```bash
# Desde el contenedor backend (si tienes prisma instalado dentro)
# o con npx desde el host (ver arriba)
```

Variables de entorno relevantes

- `DATABASE_URL` — URL de conexión a Postgres (ej: `postgres://user:pass@db:5432/twitter`)
- `REDIS_URL` — URL de Redis (ej: `redis://redis:6379`) (usado por el adaptador de Socket.IO)
- `JWT_SECRET` — clave para firmar JWTs
- `NODE_ENV`, `PORT` y otras según `src/main.ts` y `Dockerfile`/`docker-compose`.

Uso de Redis en este proyecto

- Actualmente Redis se usa para el adaptador de Socket.IO en `src/modules/notifications/notifications.gateway.ts` para permitir notificaciones en tiempo real entre instancias.
- No se utiliza como cache general (por ejemplo `cache-manager` no está integrado en el código actual).


Endpoints principales (resumen)

- `POST /auth/register` — Registrar usuario
- `POST /auth/login` — Login y obtención de tokens
- `POST /tweets` — Crear tweet
- `GET /feed` — Obtener feed (paginado por cursor)
- `POST /tweets/:id/like` — Like a tweet
- `POST /bookmarks` — Bookmark (módulo bookmarks)
- WebSocket `/notifications` — Conexión para notificaciones en tiempo real

(Esta lista es un resumen; ver controladores en `src/modules/*/*.controller.ts` para rutas completas y detalles.)
