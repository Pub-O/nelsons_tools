import './types.js';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';
import { env } from './env.js';
import { authRoutes } from './routes/auth.js';
import { employeeRoutes } from './routes/employees.js';
import { locationRoutes } from './routes/locations.js';
import { meRoutes } from './routes/me.js';
import { operationRoutes } from './routes/operations.js';
import { productRoutes } from './routes/products.js';
import { stockRoutes } from './routes/stock.js';

export async function buildServer() {
  const app = Fastify({
    logger: true
  });

  await app.register(helmet);
  await app.register(cors, {
    origin: env.corsOrigins,
    credentials: true
  });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute'
  });
  await app.register(jwt, {
    secret: env.jwtAccessSecret
  });
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Pub-O API',
        description: 'Secure API for the Pub-Organizer platform.',
        version: '0.1.0'
      }
    }
  });
  await app.register(swaggerUi, {
    routePrefix: '/docs'
  });

  app.get('/health', async () => ({
    status: 'ok',
    service: 'pub-o-api'
  }));

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(meRoutes, { prefix: '/api' });
  await app.register(locationRoutes, { prefix: '/api' });
  await app.register(productRoutes, { prefix: '/api' });
  await app.register(employeeRoutes, { prefix: '/api' });
  await app.register(stockRoutes, { prefix: '/api' });
  await app.register(operationRoutes, { prefix: '/api' });

  return app;
}

const app = await buildServer();

try {
  await app.listen({ port: env.port, host: '0.0.0.0' });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
