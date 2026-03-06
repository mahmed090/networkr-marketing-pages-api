import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  const origins = frontendUrl.split(',').map((s) => s.trim()).filter(Boolean);
  app.enableCors({ origin: origins.length > 0 ? origins : true, credentials: true });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
