/**
 * @vitest-environment node
 */

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import argon2 from "argon2";
import { describe, expect, it } from "vitest";

import { PrismaClient } from "../../src/generated/prisma/client";
import { assertEnvironmentDatabase } from "../../src/lib/db/database-target";
import {
  provisionInitialAdmin,
  type BootstrapDatabase,
} from "./production-bootstrap";

describe("production bootstrap transaction", () => {
  it("writes the admin and audit atomically and rolls back on failure", async () => {
    const url = process.env.DATABASE_URL;
    if (process.env.APP_ENV !== "test" || !url) {
      throw new Error("An isolated test database is required.");
    }
    assertEnvironmentDatabase(url, "test");
    const prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: url }, { schema: "public" }),
    });
    const email = `bootstrap-${randomUUID()}@example.org`;
    const password = "isolated-test-password";
    const rollback = new Error("test rollback");
    let tenantId = "";
    let userId = "";
    let passwordHash = "";

    const database: BootstrapDatabase = {
      async $transaction(callback, options) {
        await prisma.$transaction(async (transaction) => {
          // Other test fixtures may exist; only the emptiness check is mocked.
          const isolatedTransaction = new Proxy(transaction, {
            get(target, property, receiver) {
              const value = Reflect.get(target, property, receiver);
              if (property === "tenant" || property === "user") {
                return new Proxy(value, {
                  get(delegate, key, delegateReceiver) {
                    if (key === "count") return async () => 0;
                    return Reflect.get(delegate, key, delegateReceiver);
                  },
                });
              }
              return value;
            },
          });
          await callback(isolatedTransaction);

          const user = await transaction.user.findUniqueOrThrow({
            where: { email },
          });
          userId = user.id;
          tenantId = user.tenantId;
          passwordHash = user.passwordHash;
          expect(user.role).toBe("ADMIN");
          expect(
            await transaction.auditLog.count({
              where: {
                tenantId,
                entity: "User",
                entityId: userId,
                action: "create",
              },
            }),
          ).toBe(1);
          throw rollback;
        }, options);
      },
    };

    try {
      await expect(
        provisionInitialAdmin(database, {
          tenantName: "Rollback test tenant",
          adminName: "Rollback test admin",
          adminEmail: email,
          adminPassword: password,
        }),
      ).rejects.toBe(rollback);
      expect(userId).not.toBe("");
      expect(tenantId).not.toBe("");
      expect(await argon2.verify(passwordHash, password)).toBe(true);
      expect(
        await prisma.user.findUnique({ where: { id: userId } }),
      ).toBeNull();
      expect(
        await prisma.tenant.findUnique({ where: { id: tenantId } }),
      ).toBeNull();
      expect(await prisma.auditLog.count({ where: { tenantId } })).toBe(0);
    } finally {
      await prisma.$disconnect();
    }
  }, 30000);
});
