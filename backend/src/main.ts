import * as dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch {
  // ignore if custom DNS cannot be set
}

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  configureApp(app);

  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('QR Restaurant API').setVersion('1.0').addBearerAuth().build(),
  );
  doc.security = [{ bearer: [] }];
  SwaggerModule.setup('docs', app, doc);

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);
  const host = config.get<string>('HOST', '0.0.0.0');
  await app.listen(port, host);
  Logger.log(`API listening on http://${host}:${port}/api/v1  (docs: /docs, health: /health)`, 'Bootstrap');
}
void bootstrap();
