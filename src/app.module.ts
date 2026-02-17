import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [],
  providers: [],
})
export class AppModule {}