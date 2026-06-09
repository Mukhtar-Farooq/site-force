import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import * as dns from 'dns';

// Force Node.js to prioritize IPv4 addresses during DNS lookups.
// This prevents ENETUNREACH connection errors when running on IPv4-only hosts (like Render)
// trying to connect to dual-stack hostnames (like Supabase database poolers).
dns.setDefaultResultOrder('ipv4first');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend integration
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Increase payload size limits to allow base64 image uploads
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ limit: '15mb', extended: true }));

  const port = process.env.PORT ?? 5000;
  await app.listen(port);
  console.log(`SiteForce NestJS Backend running on: http://localhost:${port}`);
}
bootstrap();
