import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

import { assertEnvironmentDatabase } from "../src/lib/db/database-target";
import { verifyLiveDatabase } from "../scripts/lib/verify-live-database";
import { validatePreviewTarget } from "../scripts/validate-production-target";

const tenantId = "starter-demo-tenant";
const tenantName = "Book Club Platform Demo";
const adminId = "starter-demo-admin";
const exampleItemId = "starter-demo-example-item";

export async function runDemoSeed(): Promise<void> {
  const environment = process.env.APP_ENV;
  if (
    environment !== "development" &&
    environment !== "test" &&
    environment !== "preview"
  ) {
    throw new Error(
      "Demo seed is enabled only for development, test and preview.",
    );
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }
  if (environment === "preview") {
    if (
      process.env.GITHUB_ACTIONS !== "true" ||
      process.env.GITHUB_EVENT_NAME !== "pull_request"
    ) {
      throw new Error("Preview seed is restricted to GitHub pull requests.");
    }
    validatePreviewTarget(process.env);
  }
  assertEnvironmentDatabase(connectionString, environment);

  const adminEmail = process.env.DEMO_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD?.trim();
  if (!adminEmail || !adminPassword || adminPassword.length < 8) {
    throw new Error(
      "Set DEMO_ADMIN_EMAIL and a DEMO_ADMIN_PASSWORD of at least 8 characters.",
    );
  }

  const { target } = await verifyLiveDatabase();
  const passwordHash = await argon2.hash(adminPassword);
  const prisma = new PrismaClient({
    adapter: new PrismaPg(
      { connectionString },
      { schema: process.env.DATABASE_SCHEMA ?? target.schema },
    ),
  });

  try {
    await prisma.$transaction(async (transaction) => {
      const existingTenant = await transaction.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true },
      });
      if (existingTenant && existingTenant.name !== tenantName) {
        throw new Error(
          "The starter seed tenant ID belongs to another tenant; refusing to modify it.",
        );
      }

      if (!existingTenant) {
        await transaction.tenant.create({
          data: { id: tenantId, name: tenantName },
        });
      }

      const existingUser = await transaction.user.findUnique({
        where: { id: adminId },
        select: { tenantId: true },
      });
      if (existingUser && existingUser.tenantId !== tenantId) {
        throw new Error(
          "The starter seed user ID belongs to another tenant; refusing to modify it.",
        );
      }

      if (!existingUser || environment !== "preview") {
        const conflictingEmail = await transaction.user.findUnique({
          where: { email: adminEmail },
          select: { id: true, tenantId: true },
        });
        if (
          conflictingEmail &&
          (conflictingEmail.id !== adminId ||
            conflictingEmail.tenantId !== tenantId)
        ) {
          throw new Error(
            "The configured demo admin email is already owned by another user.",
          );
        }

        if (existingUser) {
          await transaction.user.update({
            where: { id: adminId },
            data: {
              name: "Book Club Administrator",
              email: adminEmail,
              passwordHash,
              role: "ADMIN",
            },
          });
        } else {
          await transaction.user.create({
            data: {
              id: adminId,
              tenantId,
              name: "Book Club Administrator",
              email: adminEmail,
              passwordHash,
              role: "ADMIN",
            },
          });
        }
      }

      const existingItem = await transaction.exampleItem.findUnique({
        where: { id: exampleItemId },
        select: { tenantId: true },
      });
      if (existingItem && existingItem.tenantId !== tenantId) {
        throw new Error(
          "The starter example item ID belongs to another tenant; refusing to modify it.",
        );
      }

      if (existingItem && environment !== "preview") {
        await transaction.exampleItem.update({
          where: { id: exampleItemId },
          data: {
            name: "Example item",
            description: "A minimal tenant-scoped starter record.",
            active: true,
          },
        });
      } else if (!existingItem) {
        await transaction.exampleItem.create({
          data: {
            id: exampleItemId,
            tenantId,
            name: "Example item",
            description: "A minimal tenant-scoped starter record.",
          },
        });
      }
    });

    console.log(
      environment === "preview"
        ? `Book Club Platform demo seed is ready in ${target.database}.`
        : `Book Club Platform demo seed is ready in ${target.database} for ${adminEmail}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}
