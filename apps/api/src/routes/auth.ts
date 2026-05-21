import argon2 from 'argon2';
import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { prisma } from '@pub-o/database';
import { randomUUID } from 'node:crypto';

const authBody = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 8 })
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', {
    schema: {
      body: Type.Intersect([
        authBody,
        Type.Object({
          name: Type.String({ minLength: 2 }),
          organizationName: Type.String({ minLength: 2 }),
          locationName: Type.String({ minLength: 2 })
        })
      ])
    }
  }, async (request, reply) => {
    const body = request.body as {
      email: string;
      password: string;
      name: string;
      organizationName: string;
      locationName: string;
    };

    const email = body.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.code(409).send({ message: 'Email is already registered' });
    }

    const passwordHash = await argon2.hash(body.password);
    const slug = body.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const user = await prisma.user.create({
      data: {
        email,
        name: body.name,
        passwordHash,
        memberships: {
          create: {
            role: 'OWNER',
            organization: {
              create: {
                name: body.organizationName,
                slug: `${slug}-${randomUUID().slice(0, 8)}`,
                locations: {
                  create: {
                    name: body.locationName
                  }
                }
              }
            }
          }
        }
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    const accessToken = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: '15m' });
    const refreshToken = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: '30d' });

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: await argon2.hash(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    return reply.code(201).send({ user, accessToken, refreshToken });
  });

  app.post('/login', { schema: { body: authBody } }, async (request, reply) => {
    const body = request.body as { email: string; password: string };
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase().trim() }
    });

    if (!user || !(await argon2.verify(user.passwordHash, body.password))) {
      return reply.code(401).send({ message: 'Invalid email or password' });
    }

    const accessToken = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: '15m' });
    const refreshToken = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: '30d' });

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: await argon2.hash(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    return {
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
      refreshToken
    };
  });
}
