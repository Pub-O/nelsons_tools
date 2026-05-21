import type { FastifyInstance } from 'fastify';
import { prisma } from '@pub-o/database';
import { requireAuth } from '../auth.js';

export async function locationRoutes(app: FastifyInstance) {
  app.get('/locations', { preHandler: requireAuth }, async (request) => {
    const memberships = await prisma.membership.findMany({
      where: { userId: request.user.sub },
      include: {
        organization: {
          include: {
            locations: {
              where: { deletedAt: null },
              orderBy: { name: 'asc' }
            }
          }
        },
        location: true
      }
    });

    const locations = memberships.flatMap((membership) => {
      if (membership.location) {
        return [membership.location];
      }

      return membership.organization.locations;
    });

    const uniqueLocations = Array.from(
      new Map(locations.map((location) => [location.id, location])).values()
    );

    return { locations: uniqueLocations };
  });
}
