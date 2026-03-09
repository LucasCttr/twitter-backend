import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Generando y ejecutando truncado de todas las tablas en schema public...');
  // Ejecuta un DO block en Postgres que trunca todas las tablas del schema public
  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'TRUNCATE TABLE "' || r.tablename || '" RESTART IDENTITY CASCADE';
      END LOOP;
    END $$;
  `);
  console.log('Truncado completado.');
}

main()
  .catch(e => {
    console.error('Error al vaciar la base de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
