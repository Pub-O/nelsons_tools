import type { FastifyInstance } from 'fastify';
import { prisma } from '@pub-o/database';
import { requireAuth, requireLocationAccess } from '../auth.js';

export async function operationRoutes(app: FastifyInstance) {
  app.get('/purchase-lists', { preHandler: requireAuth }, async (request, reply) => {
    const locationId = (request.query as { locationId?: string }).locationId;
    if (!locationId) {
      return reply.code(400).send({ message: 'locationId query parameter is required' });
    }

    const access = await requireLocationAccess(request, reply, locationId);
    if (!access) {
      return;
    }

    const purchaseLists = await prisma.purchaseList.findMany({
      where: { locationId },
      include: { items: true, supplier: true },
      orderBy: { updatedAt: 'desc' }
    });

    return { purchaseLists };
  });

  app.get('/shifts', { preHandler: requireAuth }, async (request, reply) => {
    const locationId = (request.query as { locationId?: string }).locationId;
    if (!locationId) {
      return reply.code(400).send({ message: 'locationId query parameter is required' });
    }

    const access = await requireLocationAccess(request, reply, locationId);
    if (!access) {
      return;
    }

    const shifts = await prisma.shift.findMany({
      where: { locationId },
      include: { employee: true },
      orderBy: { startsAt: 'asc' },
      take: 100
    });

    return { shifts };
  });

  app.get('/handover-notes', { preHandler: requireAuth }, async (request, reply) => {
    const locationId = (request.query as { locationId?: string }).locationId;
    if (!locationId) {
      return reply.code(400).send({ message: 'locationId query parameter is required' });
    }

    const access = await requireLocationAccess(request, reply, locationId);
    if (!access) {
      return;
    }

    const notes = await prisma.handoverNote.findMany({
      where: { locationId },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: 50
    });

    return { notes };
  });
}
