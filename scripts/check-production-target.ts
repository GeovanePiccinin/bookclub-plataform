import { validateProductionTarget } from "./validate-production-target";

try {
  validateProductionTarget(process.env);
  console.log(
    "Production migration target matches its configured host, port, database and user.",
  );
} catch (error: unknown) {
  console.error(
    "Production migration target validation failed:",
    error instanceof Error ? error.message : "unknown error",
  );
  process.exitCode = 1;
}
