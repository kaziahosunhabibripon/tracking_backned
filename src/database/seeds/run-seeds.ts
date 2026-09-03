import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { DatabaseSeedService } from './database-seed.service';

async function bootstrap() {
  const logger = new Logger('SeedRunner');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    await app.get(DatabaseSeedService).run();
    logger.log('Database seeding completed.');
  } finally {
    await app.close();
  }
}

void bootstrap();
