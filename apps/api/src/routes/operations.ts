import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { prisma } from '@pub-o/database';
import { requireAuth, requireLocationAccess } from '../auth.js';

const shiftBody = Type.Object({
  locationId: Type.String({ format: 'uuid' }),
  employeeId: Type.String({ format: 'uuid' }),
  startsAt: Type.String({ format: 'date-time' }),
  endsAt: Type.String({ format: 'date-time' }),
  title: Type.Optional(Type.String()),
  note: Type.Optional(Type.String())
});

const vacationBody = Type.Object({
  organizationId: Type.String({ format: 'uuid' }),
  employeeId: Type.String({ format: 'uuid' }),
  startsOn: Type.String({ format: 'date' }),
  endsOn: Type.String({ format: 'date' }),
  note: Type.Optional(Type.String())
});

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
    const query = request.query as { locationId?: string; from?: string; to?: string };
    const locationId = query.locationId;
    if (!locationId) {
      return reply.code(400).send({ message: 'locationId query parameter is required' });
    }

    const access = await requireLocationAccess(request, reply, locationId);
    if (!access) {
      return;
    }

    const from = query.from ? new Date(query.from) : new Date();
    const to = query.to ? new Date(query.to) : new Date(from.getFullYear(), from.getMonth() + 1, 1);

    const shifts = await prisma.shift.findMany({
      where: {
        locationId,
        startsAt: { gte: from, lt: to }
      },
      include: { employee: true },
      orderBy: { startsAt: 'asc' },
      take: 300
    });

    return { shifts };
  });

  app.post('/shifts', {
    preHandler: requireAuth,
    schema: { body: shiftBody }
  }, async (request, reply) => {
    const body = request.body as {
      locationId: string;
      employeeId: string;
      startsAt: string;
      endsAt: string;
      title?: string;
      note?: string;
    };

    const access = await requireLocationAccess(request, reply, body.locationId);
    if (!access) {
      return;
    }

    const employee = await prisma.employee.findFirst({
      where: {
        id: body.employeeId,
        organizationId: access.organizationId,
        isActive: true
      }
    });
    if (!employee) {
      return reply.code(400).send({ message: 'Employee is not available for this location' });
    }

    const shift = await prisma.shift.create({
      data: {
        locationId: body.locationId,
        employeeId: body.employeeId,
        title: body.title || 'Dienst',
        startsAt: new Date(body.startsAt),
        endsAt: new Date(body.endsAt),
        note: body.note
      },
      include: { employee: true }
    });

    return reply.code(201).send({ shift });
  });

  app.get('/vacations', { preHandler: requireAuth }, async (request, reply) => {
    const query = request.query as { organizationId?: string; from?: string; to?: string };
    if (!query.organizationId) {
      return reply.code(400).send({ message: 'organizationId query parameter is required' });
    }

    const membership = await prisma.membership.findFirst({
      where: {
        userId: request.user.sub,
        organizationId: query.organizationId
      }
    });
    if (!membership) {
      return reply.code(403).send({ message: 'You do not have access to this organization' });
    }

    const from = query.from ? new Date(query.from) : new Date();
    const to = query.to ? new Date(query.to) : new Date(from.getFullYear(), from.getMonth() + 1, 1);
    const vacations = await prisma.employeeVacation.findMany({
      where: {
        organizationId: query.organizationId,
        startsOn: { lt: to },
        endsOn: { gte: from }
      },
      include: { employee: true },
      orderBy: [{ startsOn: 'asc' }, { employee: { name: 'asc' } }]
    });

    return { vacations };
  });

  app.post('/vacations', {
    preHandler: requireAuth,
    schema: { body: vacationBody }
  }, async (request, reply) => {
    const body = request.body as {
      organizationId: string;
      employeeId: string;
      startsOn: string;
      endsOn: string;
      note?: string;
    };

    const membership = await prisma.membership.findFirst({
      where: {
        userId: request.user.sub,
        organizationId: body.organizationId
      }
    });
    if (!membership) {
      return reply.code(403).send({ message: 'You do not have access to this organization' });
    }

    const employee = await prisma.employee.findFirst({
      where: {
        id: body.employeeId,
        organizationId: body.organizationId,
        isActive: true
      }
    });
    if (!employee) {
      return reply.code(400).send({ message: 'Employee not found' });
    }

    const vacation = await prisma.employeeVacation.create({
      data: {
        organizationId: body.organizationId,
        employeeId: body.employeeId,
        startsOn: new Date(body.startsOn),
        endsOn: new Date(body.endsOn),
        note: body.note
      },
      include: { employee: true }
    });

    return reply.code(201).send({ vacation });
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
