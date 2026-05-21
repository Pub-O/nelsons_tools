import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '@pub-o/database';

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ message: 'Authentication required' });
  }
}

export async function requireLocationAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  locationId: string
) {
  const membership = await prisma.membership.findFirst({
    where: {
      userId: request.user.sub,
      OR: [
        { locationId },
        {
          locationId: null,
          organization: {
            locations: {
              some: { id: locationId }
            }
          }
        }
      ]
    }
  });

  if (!membership) {
    return reply.code(403).send({ message: 'You do not have access to this location' });
  }

  return membership;
}

export async function requireOrganizationManager(
  request: FastifyRequest,
  reply: FastifyReply,
  organizationId: string
) {
  const membership = await prisma.membership.findFirst({
    where: {
      userId: request.user.sub,
      organizationId,
      role: { in: ['OWNER', 'MANAGER'] }
    }
  });

  if (!membership) {
    return reply.code(403).send({ message: 'Manager access required' });
  }

  return membership;
}

export function registerAuthHooks(app: FastifyInstance) {
  app.decorate('requireAuth', requireAuth);
}
