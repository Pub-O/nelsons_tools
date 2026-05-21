import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { prisma } from '@pub-o/database';
import { requireAuth, requireOrganizationManager } from '../auth.js';

const productBody = Type.Object({
  organizationId: Type.String({ format: 'uuid' }),
  categoryId: Type.Optional(Type.String({ format: 'uuid' })),
  name: Type.String({ minLength: 1 }),
  unit: Type.String({ minLength: 1 }),
  containerType: Type.Optional(Type.String({ minLength: 1 })),
  containerSize: Type.Optional(Type.Number({ minimum: 0 })),
  containerUnit: Type.Optional(Type.String({ minLength: 1 })),
  reorderPoint: Type.Optional(Type.Number({ minimum: 0 })),
  parLevel: Type.Optional(Type.Number({ minimum: 0 })),
  isEasyCount: Type.Optional(Type.Boolean()),
  easyCountUnitQty: Type.Optional(Type.Number({ minimum: 0 }))
});

export async function productRoutes(app: FastifyInstance) {
  app.get('/products', { preHandler: requireAuth }, async (request) => {
    const organizationIds = await prisma.membership.findMany({
      where: { userId: request.user.sub },
      select: { organizationId: true }
    });

    const products = await prisma.product.findMany({
      where: {
        organizationId: { in: organizationIds.map((item) => item.organizationId) },
        deletedAt: null
      },
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
      include: { category: true }
    });

    return { products };
  });

  app.post('/products', {
    preHandler: requireAuth,
    schema: { body: productBody }
  }, async (request, reply) => {
    const body = request.body as {
      organizationId: string;
      categoryId?: string;
      name: string;
      unit: string;
      containerType?: string;
      containerSize?: number;
      containerUnit?: string;
      reorderPoint?: number;
      parLevel?: number;
      isEasyCount?: boolean;
      easyCountUnitQty?: number;
    };

    const membership = await requireOrganizationManager(request, reply, body.organizationId);
    if (!membership) {
      return;
    }

    const product = await prisma.product.create({
      data: {
        organizationId: body.organizationId,
        categoryId: body.categoryId,
        name: body.name,
        unit: body.unit,
        containerType: body.containerType ?? 'Stück',
        containerSize: body.containerSize,
        containerUnit: body.containerUnit,
        reorderPoint: body.reorderPoint,
        parLevel: body.parLevel,
        isEasyCount: body.isEasyCount ?? false,
        easyCountUnitQty: body.isEasyCount ? body.easyCountUnitQty : undefined
      }
    });

    return reply.code(201).send({ product });
  });
}
