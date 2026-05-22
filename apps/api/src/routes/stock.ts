import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { prisma } from '@pub-o/database';
import { requireAuth, requireLocationAccess } from '../auth.js';

const EASY_COUNT_MINIMUM_POINTS = 5;
const EASY_COUNT_DEFAULT_UNIT_QTY = 0.05;

function normalizeEasyCountPoints(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.floor(value / EASY_COUNT_MINIMUM_POINTS) * EASY_COUNT_MINIMUM_POINTS;
}

const stockCountBody = Type.Object({
  locationId: Type.String({ format: 'uuid' }),
  note: Type.Optional(Type.String()),
  lines: Type.Array(Type.Object({
    productId: Type.String({ format: 'uuid' }),
    countedQty: Type.Number({ minimum: 0 })
  }), { minItems: 1 })
});

const easyCountBody = Type.Object({
  locationId: Type.String({ format: 'uuid' }),
  note: Type.Optional(Type.String()),
  lines: Type.Array(Type.Object({
    productId: Type.String({ format: 'uuid' }),
    startingCount: Type.Integer({ minimum: 0 }),
    targetCount: Type.Integer({ minimum: 0 }),
    registerCount: Type.Integer({ minimum: 0 })
  }), { minItems: 1 })
});

export async function stockRoutes(app: FastifyInstance) {
  app.get('/stock', { preHandler: requireAuth }, async (request, reply) => {
    const locationId = (request.query as { locationId?: string }).locationId;
    if (!locationId) {
      return reply.code(400).send({ message: 'locationId query parameter is required' });
    }

    const access = await requireLocationAccess(request, reply, locationId);
    if (!access) {
      return;
    }

    const stockItems = await prisma.stockItem.findMany({
      where: { locationId },
      include: { product: { include: { category: true } } },
      orderBy: { product: { name: 'asc' } }
    });

    return { stockItems };
  });

  app.post('/stock-counts', {
    preHandler: requireAuth,
    schema: { body: stockCountBody }
  }, async (request, reply) => {
    const body = request.body as {
      locationId: string;
      note?: string;
      lines: Array<{ productId: string; countedQty: number }>;
    };

    const access = await requireLocationAccess(request, reply, body.locationId);
    if (!access) {
      return;
    }

    const stockCount = await prisma.$transaction(async (tx) => {
      const count = await tx.stockCount.create({
        data: {
          locationId: body.locationId,
          countedById: request.user.sub,
          note: body.note,
          lines: {
            create: body.lines.map((line) => ({
              productId: line.productId,
              countedQty: line.countedQty
            }))
          }
        },
        include: { lines: true }
      });

      for (const line of body.lines) {
        const current = await tx.stockItem.findUnique({
          where: {
            locationId_productId: {
              locationId: body.locationId,
              productId: line.productId
            }
          }
        });

        const previous = Number(current?.quantity ?? 0);
        const delta = line.countedQty - previous;

        await tx.stockItem.upsert({
          where: {
            locationId_productId: {
              locationId: body.locationId,
              productId: line.productId
            }
          },
          update: { quantity: line.countedQty },
          create: {
            locationId: body.locationId,
            productId: line.productId,
            quantity: line.countedQty
          }
        });

        await tx.stockMovement.create({
          data: {
            locationId: body.locationId,
            productId: line.productId,
            stockCountId: count.id,
            type: 'COUNT',
            quantityDelta: delta,
            note: body.note
          }
        });
      }

      return count;
    });

    return reply.code(201).send({ stockCount });
  });

  app.get('/easy-count-runs', { preHandler: requireAuth }, async (request, reply) => {
    const locationId = (request.query as { locationId?: string }).locationId;
    if (!locationId) {
      return reply.code(400).send({ message: 'locationId query parameter is required' });
    }

    const access = await requireLocationAccess(request, reply, locationId);
    if (!access) {
      return;
    }

    const runs = await prisma.easyCountRun.findMany({
      where: { locationId },
      include: { lines: { include: { product: true } } },
      orderBy: { countedAt: 'desc' },
      take: 20
    });

    return { runs };
  });

  app.post('/easy-count-runs', {
    preHandler: requireAuth,
    schema: { body: easyCountBody }
  }, async (request, reply) => {
    const body = request.body as {
      locationId: string;
      note?: string;
      lines: Array<{
        productId: string;
        startingCount: number;
        targetCount: number;
        registerCount: number;
      }>;
    };

    const access = await requireLocationAccess(request, reply, body.locationId);
    if (!access) {
      return;
    }

    const products = await prisma.product.findMany({
      where: {
        id: { in: body.lines.map((line) => line.productId) },
        organizationId: access.organizationId,
        isEasyCount: true,
        deletedAt: null
      }
    });
    const productsById = new Map(products.map((product) => [product.id, product]));

    if (productsById.size !== body.lines.length) {
      return reply.code(400).send({ message: 'All EasyCount lines must reference Easy Count products' });
    }

    const easyCountRun = await prisma.$transaction(async (tx) => {
      const run = await tx.easyCountRun.create({
        data: {
          locationId: body.locationId,
          countedById: request.user.sub,
          note: body.note
        }
      });

      const createdLines = [];

      for (const line of body.lines) {
        const product = productsById.get(line.productId);
        const quantityPerPoint = Number(product?.easyCountUnitQty ?? EASY_COUNT_DEFAULT_UNIT_QTY) || EASY_COUNT_DEFAULT_UNIT_QTY;
        const targetCount = normalizeEasyCountPoints(line.targetCount);
        const registerCount = normalizeEasyCountPoints(line.registerCount);
        const startingCount = normalizeEasyCountPoints(line.startingCount);
        const differenceCount = targetCount - registerCount;
        const correctionQty = differenceCount * quantityPerPoint;
        const targetQty = targetCount * quantityPerPoint;

        const current = await tx.stockItem.findUnique({
          where: {
            locationId_productId: {
              locationId: body.locationId,
              productId: line.productId
            }
          }
        });
        const previous = Number(current?.quantity ?? 0);

        await tx.stockItem.upsert({
          where: {
            locationId_productId: {
              locationId: body.locationId,
              productId: line.productId
            }
          },
          update: { quantity: targetQty },
          create: {
            locationId: body.locationId,
            productId: line.productId,
            quantity: targetQty
          }
        });

        await tx.stockMovement.create({
          data: {
            locationId: body.locationId,
            productId: line.productId,
            type: 'ADJUSTMENT',
            quantityDelta: targetQty - previous,
            note: `EasyCount: ${differenceCount} Punkte Nachbonnage`
          }
        });

        createdLines.push(await tx.easyCountLine.create({
          data: {
            easyCountRunId: run.id,
            productId: line.productId,
            startingCount,
            targetCount,
            registerCount,
            differenceCount,
            quantityPerPoint,
            correctionQty
          },
          include: { product: true }
        }));
      }

      return { ...run, lines: createdLines };
    });

    return reply.code(201).send({ easyCountRun });
  });
}
