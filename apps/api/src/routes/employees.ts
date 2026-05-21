import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { prisma } from '@pub-o/database';
import { requireAuth, requireOrganizationManager } from '../auth.js';

const employeeBody = Type.Object({
  organizationId: Type.String({ format: 'uuid' }),
  name: Type.String({ minLength: 1 }),
  email: Type.Optional(Type.String({ format: 'email' })),
  phone: Type.Optional(Type.String()),
  weeklyHours: Type.Optional(Type.Integer({ minimum: 0 })),
  canConfigureProducts: Type.Optional(Type.Boolean()),
  canManageEmployees: Type.Optional(Type.Boolean()),
  canManageLists: Type.Optional(Type.Boolean()),
  canManageSchedule: Type.Optional(Type.Boolean()),
  canUseEasyCount: Type.Optional(Type.Boolean()),
  isActive: Type.Optional(Type.Boolean())
});

export async function employeeRoutes(app: FastifyInstance) {
  app.get('/employees', { preHandler: requireAuth }, async (request) => {
    const organizationIds = await prisma.membership.findMany({
      where: { userId: request.user.sub },
      select: { organizationId: true }
    });

    const employees = await prisma.employee.findMany({
      where: {
        organizationId: { in: organizationIds.map((item) => item.organizationId) }
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }]
    });

    return { employees };
  });

  app.post('/employees', {
    preHandler: requireAuth,
    schema: { body: employeeBody }
  }, async (request, reply) => {
    const body = request.body as EmployeeBody;
    const membership = await requireOrganizationManager(request, reply, body.organizationId);
    if (!membership) {
      return;
    }

    const employee = await prisma.employee.create({
      data: toEmployeeData(body)
    });

    return reply.code(201).send({ employee });
  });

  app.patch('/employees/:id', {
    preHandler: requireAuth,
    schema: {
      body: employeeBody,
      params: Type.Object({ id: Type.String({ format: 'uuid' }) })
    }
  }, async (request, reply) => {
    const params = request.params as { id: string };
    const body = request.body as EmployeeBody;
    const existing = await prisma.employee.findUnique({ where: { id: params.id } });
    if (!existing) {
      return reply.code(404).send({ message: 'Employee not found' });
    }

    const membership = await requireOrganizationManager(request, reply, existing.organizationId);
    if (!membership) {
      return;
    }

    const employee = await prisma.employee.update({
      where: { id: params.id },
      data: toEmployeeData({ ...body, organizationId: existing.organizationId })
    });

    return { employee };
  });
}

type EmployeeBody = {
  organizationId: string;
  name: string;
  email?: string;
  phone?: string;
  weeklyHours?: number;
  canConfigureProducts?: boolean;
  canManageEmployees?: boolean;
  canManageLists?: boolean;
  canManageSchedule?: boolean;
  canUseEasyCount?: boolean;
  isActive?: boolean;
};

function toEmployeeData(body: EmployeeBody) {
  return {
    organizationId: body.organizationId,
    name: body.name,
    email: body.email || null,
    phone: body.phone || null,
    weeklyHours: body.weeklyHours ?? 0,
    canConfigureProducts: body.canConfigureProducts ?? false,
    canManageEmployees: body.canManageEmployees ?? false,
    canManageLists: body.canManageLists ?? false,
    canManageSchedule: body.canManageSchedule ?? false,
    canUseEasyCount: body.canUseEasyCount ?? false,
    isActive: body.isActive ?? true
  };
}
