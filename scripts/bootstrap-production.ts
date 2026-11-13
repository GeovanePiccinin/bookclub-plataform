import { PrismaPg } from "@prisma/adapter-pg";

import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { verifyLiveDatabase } from "./lib/verify-live-database";
import {
  provisionInitialAdmin,
  readBootstrapInput,
  validateBootstrapTarget,
  BootstrapValidationError,
} from "./lib/production-bootstrap";

async function main(): Promise<void> {
  const target = validateBootstrapTarget(process.env);
  const input = readBootstrapInput(process.env);
  const live = await verifyLiveDatabase();
  if (
    live.target.host !== target.host ||
    live.target.port !== target.port ||
    live.target.database !== target.database ||
    live.target.schema !== target.schema
  ) {
    throw new Error("Live database target validation failed.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg(
      { connectionString: process.env.DATABASE_URL },
      { schema: target.schema },
    ),
  });
  try {
    await provisionInitialAdmin(prisma, input);
    console.log("Initial tenant and administrator created.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  if (error instanceof BootstrapValidationError) {
    console.error("Production bootstrap failed:", error.message);
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error("Production bootstrap database error:", error.code);
  } else {
    console.error(
      "Production bootstrap failed unexpectedly. Check the target, database connectivity, and migration status.",
    );
  }
  process.exitCode = 1;
});
