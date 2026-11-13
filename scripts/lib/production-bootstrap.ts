import argon2 from "argon2";
import { z } from "zod";

import { Prisma } from "../../src/generated/prisma/client";
import {
  getDatabaseTarget,
  type DatabaseTarget,
} from "../../src/lib/db/database-target";

const bootstrapInputSchema = z.object({
  tenantName: z.string().trim().min(1).max(100),
  adminName: z.string().trim().min(1).max(100),
  adminEmail: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  adminPassword: z.string().min(16).max(256),
});

export class BootstrapValidationError extends Error {}

export type BootstrapInput = z.infer<typeof bootstrapInputSchema>;

export interface BootstrapDatabase {
  $transaction(
    callback: (transaction: Prisma.TransactionClient) => Promise<void>,
    options: { isolationLevel: Prisma.TransactionIsolationLevel },
  ): Promise<void>;
}

export function readBootstrapInput(
  env: Record<string, string | undefined>,
): BootstrapInput {
  const result = bootstrapInputSchema.safeParse({
    tenantName: env.BOOTSTRAP_TENANT_NAME,
    adminName: env.BOOTSTRAP_ADMIN_NAME,
    adminEmail: env.BOOTSTRAP_ADMIN_EMAIL,
    adminPassword: env.BOOTSTRAP_ADMIN_PASSWORD,
  });
  if (!result.success) {
    throw new BootstrapValidationError(
      "Bootstrap names, email, and a password of 16 to 256 characters are required.",
    );
  }
  return result.data;
}

export function validateBootstrapTarget(
  env: Record<string, string | undefined>,
): DatabaseTarget {
  if (
    env.APP_ENV !== "production" ||
    env.GITHUB_ACTIONS !== "true" ||
    env.GITHUB_EVENT_NAME !== "workflow_dispatch" ||
    env.GITHUB_REF !== "refs/heads/main"
  ) {
    throw new BootstrapValidationError(
      "Production bootstrap must run manually on main in GitHub Actions.",
    );
  }

  if (!env.DATABASE_URL) {
    throw new BootstrapValidationError("DATABASE_URL is required.");
  }
  const target = getDatabaseTarget(env.DATABASE_URL);
  if (
    !env.BOOTSTRAP_EXPECTED_HOST ||
    !env.BOOTSTRAP_EXPECTED_PORT ||
    !env.BOOTSTRAP_EXPECTED_DATABASE ||
    target.host !== env.BOOTSTRAP_EXPECTED_HOST.toLowerCase().trim() ||
    target.port !== env.BOOTSTRAP_EXPECTED_PORT.trim() ||
    target.database !== env.BOOTSTRAP_EXPECTED_DATABASE.trim() ||
    target.schema !== "public"
  ) {
    throw new BootstrapValidationError(
      "DATABASE_URL does not match the independently configured production target.",
    );
  }
  if (
    ["localhost", "127.0.0.1", "[::1]"].includes(target.host) ||
    target.database.endsWith("_test")
  ) {
    throw new BootstrapValidationError(
      "Bootstrap cannot target a local or test database.",
    );
  }
  return target;
}

export async function provisionInitialAdmin(
  prisma: BootstrapDatabase,
  input: BootstrapInput,
): Promise<void> {
  const passwordHash = await argon2.hash(input.adminPassword);

  await prisma.$transaction(
    async (transaction) => {
      if (
        (await transaction.tenant.count()) !== 0 ||
        (await transaction.user.count()) !== 0
      ) {
        throw new BootstrapValidationError(
          "Bootstrap requires an empty tenant and user database; no changes were made.",
        );
      }

      const tenant = await transaction.tenant.create({
        data: { name: input.tenantName },
      });
      const admin = await transaction.user.create({
        data: {
          tenantId: tenant.id,
          name: input.adminName,
          email: input.adminEmail,
          passwordHash,
          role: "ADMIN",
        },
      });
      await transaction.auditLog.create({
        data: {
          tenantId: tenant.id,
          action: "create",
          entity: "User",
          entityId: admin.id,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
