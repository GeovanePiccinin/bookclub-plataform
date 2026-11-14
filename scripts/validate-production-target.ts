import { getDatabaseTarget } from "../src/lib/db/database-target";

function validateMigrationTarget(
  env: Record<string, string | undefined>,
  environment: "production" | "preview",
): void {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }
  const target = getDatabaseTarget(env.DATABASE_URL);
  const username = decodeURIComponent(new URL(env.DATABASE_URL).username);
  if (
    !env.MIGRATION_EXPECTED_HOST ||
    !env.MIGRATION_EXPECTED_PORT ||
    !env.MIGRATION_EXPECTED_DATABASE ||
    !env.MIGRATION_EXPECTED_USER ||
    target.host !== env.MIGRATION_EXPECTED_HOST.trim().toLowerCase() ||
    target.port !== env.MIGRATION_EXPECTED_PORT.trim() ||
    target.database !== env.MIGRATION_EXPECTED_DATABASE.trim() ||
    username !== env.MIGRATION_EXPECTED_USER.trim() ||
    ["localhost", "127.0.0.1", "[::1]"].includes(target.host) ||
    target.database.endsWith("_test")
  ) {
    throw new Error(
      `Migration DATABASE_URL does not match the independently configured ${environment} target.`,
    );
  }
}

export function validateProductionTarget(
  env: Record<string, string | undefined>,
): void {
  validateMigrationTarget(env, "production");
}

export function validatePreviewTarget(
  env: Record<string, string | undefined>,
): void {
  validateMigrationTarget(
    {
      DATABASE_URL: env.DATABASE_URL,
      MIGRATION_EXPECTED_HOST: env.PREVIEW_MIGRATION_EXPECTED_HOST,
      MIGRATION_EXPECTED_PORT: env.PREVIEW_MIGRATION_EXPECTED_PORT,
      MIGRATION_EXPECTED_DATABASE: env.PREVIEW_MIGRATION_EXPECTED_DATABASE,
      MIGRATION_EXPECTED_USER: env.PREVIEW_MIGRATION_EXPECTED_USER,
    },
    "preview",
  );
}
