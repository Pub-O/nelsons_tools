import type { FastifyInstance } from 'fastify';
import { prisma } from '@pub-o/database';
import { requireAuth } from '../auth.js';

export async function meRoutes(app: FastifyInstance) {
  app.get('/me', { preHandler: requireAuth }, async (request) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: request.user.sub },
      select: {
        id: true,
        email: true,
        name: true,
        memberships: {
          select: {
            id: true,
            role: true,
            organization: {
              select: {
                id: true,
                name: true
              }
            },
            location: {
              select: {
                id: true,
                name: true,
                timezone: true
              }
            }
          }
        }
      }
    });

    return { user };
  });
}
