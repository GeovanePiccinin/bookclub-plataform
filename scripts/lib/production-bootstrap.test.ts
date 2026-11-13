/**
 * @vitest-environment node
 */

import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tenantCount: vi.fn(),
  userCount: vi.fn(),
  tenantCreate: vi.fn(),
  userCreate: vi.fn(),
  auditCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("../../src/generated/prisma/client", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../../src/generated/prisma/client")>();
  return {
    ...original,
    PrismaClient: class {
      $transaction = mocks.transaction;
    },
  };
});

import { PrismaClient } from "../../src/generated/prisma/client";
import {
  provisionInitialAdmin,
  readBootstrapInput,
  validateBootstrapTarget,
} from "./production-bootstrap";

const input = {
  tenantName: "Book Club",
  adminName: "Administrator",
  adminEmail: "admin@example.org",
  adminPassword: "a-strong-password-123",
};

function createMockClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        "postgresql://test:test@127.0.0.1:5432/software_starter_test",
    }),
  });
}

const productionEnv = {
  APP_ENV: "production",
  GITHUB_ACTIONS: "true",
  GITHUB_EVENT_NAME: "workflow_dispatch",
  GITHUB_REF: "refs/heads/main",
  DATABASE_URL: "postgresql://test:test@db.example.org:5432/bookclub",
  BOOTSTRAP_EXPECTED_HOST: "db.example.org",
  BOOTSTRAP_EXPECTED_PORT: "5432",
  BOOTSTRAP_EXPECTED_DATABASE: "bookclub",
};

describe("production bootstrap validation", () => {
  it("requires a manual main-branch production run and an exact target", () => {
    expect(validateBootstrapTarget(productionEnv)).toMatchObject({
      host: "db.example.org",
      port: "5432",
      database: "bookclub",
      schema: "public",
    });

    for (const changes of [
      { APP_ENV: "test" },
      { GITHUB_ACTIONS: "false" },
      { GITHUB_EVENT_NAME: "push" },
      { GITHUB_REF: "refs/heads/feature" },
      { BOOTSTRAP_EXPECTED_HOST: "other.example.org" },
      { BOOTSTRAP_EXPECTED_PORT: "5433" },
      { BOOTSTRAP_EXPECTED_DATABASE: "other" },
      { BOOTSTRAP_EXPECTED_DATABASE: "" },
      {
        DATABASE_URL:
          "postgresql://test:test@db.example.org:5432/bookclub?schema=other",
      },
      {
        DATABASE_URL: "postgresql://test:test@127.0.0.1:5432/bookclub",
        BOOTSTRAP_EXPECTED_HOST: "127.0.0.1",
      },
      {
        DATABASE_URL:
          "postgresql://test:test@db.example.org:5432/bookclub_test",
        BOOTSTRAP_EXPECTED_DATABASE: "bookclub_test",
      },
    ]) {
      expect(() =>
        validateBootstrapTarget({ ...productionEnv, ...changes }),
      ).toThrow();
    }
  });

  it("validates inputs and normalizes email without changing the password", () => {
    const env = {
      BOOTSTRAP_TENANT_NAME: " Book Club ",
      BOOTSTRAP_ADMIN_NAME: " Admin ",
      BOOTSTRAP_ADMIN_EMAIL: " ADMIN@EXAMPLE.ORG ",
      BOOTSTRAP_ADMIN_PASSWORD: " long password with spaces ",
    };
    expect(readBootstrapInput(env)).toEqual({
      tenantName: "Book Club",
      adminName: "Admin",
      adminEmail: "admin@example.org",
      adminPassword: env.BOOTSTRAP_ADMIN_PASSWORD,
    });
    expect(() =>
      readBootstrapInput({ ...env, BOOTSTRAP_ADMIN_PASSWORD: "short" }),
    ).toThrow();
    expect(() =>
      readBootstrapInput({ ...env, BOOTSTRAP_ADMIN_EMAIL: "invalid" }),
    ).toThrow();
    expect(() =>
      readBootstrapInput({ ...env, BOOTSTRAP_TENANT_NAME: " " }),
    ).toThrow();
  });
});

describe("provisionInitialAdmin", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.tenantCount.mockResolvedValue(0);
    mocks.userCount.mockResolvedValue(0);
    mocks.tenantCreate.mockResolvedValue({ id: "tenant-1" });
    mocks.userCreate.mockResolvedValue({ id: "admin-1" });
    mocks.auditCreate.mockResolvedValue({});
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        tenant: { count: mocks.tenantCount, create: mocks.tenantCreate },
        user: { count: mocks.userCount, create: mocks.userCreate },
        auditLog: { create: mocks.auditCreate },
      }),
    );
  });

  it("creates an admin and audit record in a serializable transaction", async () => {
    await provisionInitialAdmin(createMockClient(), input);
    expect(mocks.transaction.mock.calls[0][1]).toEqual({
      isolationLevel: "Serializable",
    });
    expect(mocks.tenantCreate).toHaveBeenCalledWith({
      data: { name: input.tenantName },
    });
    const data = mocks.userCreate.mock.calls[0][0].data;
    expect(data).toMatchObject({
      tenantId: "tenant-1",
      name: input.adminName,
      email: input.adminEmail,
      role: "ADMIN",
    });
    expect(await argon2.verify(data.passwordHash, input.adminPassword)).toBe(
      true,
    );
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: {
        tenantId: "tenant-1",
        action: "create",
        entity: "User",
        entityId: "admin-1",
      },
    });
  }, 30000);

  it.each(["tenant", "user"])(
    "refuses to modify an existing %s, including on repeat",
    async (existing) => {
      if (existing === "tenant") mocks.tenantCount.mockResolvedValue(1);
      else mocks.userCount.mockResolvedValue(1);
      await expect(
        provisionInitialAdmin(createMockClient(), input),
      ).rejects.toThrow("Bootstrap requires an empty tenant and user database");
      expect(mocks.tenantCreate).not.toHaveBeenCalled();
      expect(mocks.userCreate).not.toHaveBeenCalled();
      expect(mocks.auditCreate).not.toHaveBeenCalled();
    },
    30000,
  );

  it("propagates audit errors so the transaction cannot commit", async () => {
    mocks.auditCreate.mockRejectedValue(new Error("audit failed"));
    await expect(
      provisionInitialAdmin(createMockClient(), input),
    ).rejects.toThrow("audit failed");
  }, 30000);
});
