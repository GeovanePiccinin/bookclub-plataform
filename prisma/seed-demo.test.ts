/**
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tenantFind: vi.fn(),
  tenantCreate: vi.fn(),
  userFind: vi.fn(),
  userCreate: vi.fn(),
  userUpdate: vi.fn(),
  itemFind: vi.fn(),
  itemCreate: vi.fn(),
  itemUpdate: vi.fn(),
  transaction: vi.fn(),
  disconnect: vi.fn(),
  verify: vi.fn(),
  hash: vi.fn(),
}));

vi.mock("../src/generated/prisma/client", () => ({
  PrismaClient: class {
    $transaction = mocks.transaction;
    $disconnect = mocks.disconnect;
  },
}));
vi.mock("../scripts/lib/verify-live-database", () => ({
  verifyLiveDatabase: mocks.verify,
}));
vi.mock("argon2", () => ({ default: { hash: mocks.hash } }));

import { runDemoSeed } from "./seed-demo";

describe("demo seed in preview", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    const env = {
      APP_ENV: "preview",
      GITHUB_ACTIONS: "true",
      GITHUB_EVENT_NAME: "pull_request",
      DATABASE_URL: "postgresql://preview:fake@db.example.org:5432/bookclub",
      PREVIEW_MIGRATION_EXPECTED_HOST: "db.example.org",
      PREVIEW_MIGRATION_EXPECTED_PORT: "5432",
      PREVIEW_MIGRATION_EXPECTED_DATABASE: "bookclub",
      PREVIEW_MIGRATION_EXPECTED_USER: "preview",
      DEMO_ADMIN_EMAIL: "admin@example.org",
      DEMO_ADMIN_PASSWORD: "demo-password",
    };
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);

    mocks.verify.mockResolvedValue({
      target: { database: "bookclub", schema: "public" },
    });
    mocks.hash.mockResolvedValue("hashed-password");
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        tenant: { findUnique: mocks.tenantFind, create: mocks.tenantCreate },
        user: {
          findUnique: mocks.userFind,
          create: mocks.userCreate,
          update: mocks.userUpdate,
        },
        exampleItem: {
          findUnique: mocks.itemFind,
          create: mocks.itemCreate,
          update: mocks.itemUpdate,
        },
      }),
    );
    mocks.tenantFind.mockResolvedValue(null);
    mocks.userFind.mockResolvedValue(null);
    mocks.itemFind.mockResolvedValue(null);
  });

  afterEach(() => vi.unstubAllEnvs());

  it("creates missing demonstration records and preserves them on repeat", async () => {
    await runDemoSeed();
    expect(mocks.tenantCreate).toHaveBeenCalledOnce();
    expect(mocks.userCreate).toHaveBeenCalledOnce();
    expect(mocks.userCreate.mock.calls[0][0].data).toMatchObject({
      email: "admin@example.org",
      passwordHash: "hashed-password",
      tenantId: "starter-demo-tenant",
    });
    expect(mocks.itemCreate).toHaveBeenCalledOnce();

    vi.clearAllMocks();
    mocks.tenantFind.mockResolvedValue({ name: "Book Club Platform Demo" });
    mocks.userFind.mockResolvedValue({ tenantId: "starter-demo-tenant" });
    mocks.itemFind.mockResolvedValue({ tenantId: "starter-demo-tenant" });
    vi.stubEnv("DEMO_ADMIN_EMAIL", "changed@example.org");
    vi.stubEnv("DEMO_ADMIN_PASSWORD", "changed-password");
    await runDemoSeed();
    expect(mocks.tenantCreate).not.toHaveBeenCalled();
    expect(mocks.userCreate).not.toHaveBeenCalled();
    expect(mocks.userUpdate).not.toHaveBeenCalled();
    expect(mocks.itemCreate).not.toHaveBeenCalled();
    expect(mocks.itemUpdate).not.toHaveBeenCalled();
  });

  it("recreates missing records without changing existing ones", async () => {
    mocks.tenantFind.mockResolvedValue({ name: "Book Club Platform Demo" });
    mocks.userFind.mockResolvedValue({ tenantId: "starter-demo-tenant" });
    await runDemoSeed();
    expect(mocks.userUpdate).not.toHaveBeenCalled();
    expect(mocks.itemCreate).toHaveBeenCalledOnce();
  });

  it("refuses a conflicting user before modifying it", async () => {
    mocks.userFind.mockResolvedValue({ tenantId: "another-tenant" });
    await expect(runDemoSeed()).rejects.toThrow("belongs to another tenant");
    expect(mocks.userUpdate).not.toHaveBeenCalled();
    expect(mocks.disconnect).toHaveBeenCalledOnce();
  });

  it("refuses to create an administrator with another user's email", async () => {
    mocks.userFind.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: "another-user",
      tenantId: "another-tenant",
    });
    await expect(runDemoSeed()).rejects.toThrow(
      "already owned by another user",
    );
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it("rejects unsafe environment and target before connecting", async () => {
    vi.stubEnv("GITHUB_EVENT_NAME", "push");
    await expect(runDemoSeed()).rejects.toThrow("restricted to GitHub");
    vi.stubEnv("GITHUB_EVENT_NAME", "pull_request");
    vi.stubEnv("PREVIEW_MIGRATION_EXPECTED_HOST", "other.example.org");
    await expect(runDemoSeed()).rejects.toThrow("preview target");
    expect(mocks.verify).not.toHaveBeenCalled();
  });

  it("rejects missing credentials", async () => {
    vi.stubEnv("DEMO_ADMIN_PASSWORD", "");
    await expect(runDemoSeed()).rejects.toThrow("DEMO_ADMIN_PASSWORD");
    expect(mocks.verify).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("continues rejecting production before connecting", async () => {
    vi.stubEnv("APP_ENV", "production");
    await expect(runDemoSeed()).rejects.toThrow(
      "Demo seed is enabled only for development, test and preview",
    );
    expect(mocks.verify).not.toHaveBeenCalled();
  });

  it("continues updating existing development records", async () => {
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://test:test@127.0.0.1:5432/software_starter_dev",
    );
    mocks.tenantFind.mockResolvedValue({ name: "Book Club Platform Demo" });
    mocks.userFind
      .mockResolvedValueOnce({ tenantId: "starter-demo-tenant" })
      .mockResolvedValueOnce(null);
    mocks.itemFind.mockResolvedValue({ tenantId: "starter-demo-tenant" });
    await runDemoSeed();
    expect(mocks.userUpdate).toHaveBeenCalledOnce();
    expect(mocks.itemUpdate).toHaveBeenCalledOnce();
  });
});
