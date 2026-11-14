/**
 * @vitest-environment node
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ci = readFileSync(".github/workflows/ci.yml", "utf8");
const release = readFileSync(".github/workflows/prod-db-setup.yml", "utf8");
const bootstrap = readFileSync(
  ".github/workflows/production-bootstrap.yml",
  "utf8",
);
const vercelConfig = JSON.parse(readFileSync("vercel.json", "utf8"));

describe("production release safeguards", () => {
  it("runs the release after quality on main pushes only", () => {
    expect(ci).toContain(
      "if: github.event_name == 'push' && github.ref == 'refs/heads/main'",
    );
    expect(ci).toContain("needs: quality");
    expect(ci).toContain("uses: ./.github/workflows/prod-db-setup.yml");
    expect(release).toContain("workflow_call:");
    expect(release).not.toContain("workflow_dispatch:");
    expect(release).toContain('RELEASE_ENABLED" != "true"');
  });

  it("runs preview migrations only after quality on pull requests", () => {
    const preview = ci
      .split("  migrate-preview:")[1]
      ?.split("  production-release:")[0];
    expect(preview).toBeDefined();
    expect(preview).toContain("if: github.event_name == 'pull_request'");
    expect(preview).toContain("needs: quality");
    expect(preview).toContain("environment: preview");
    expect(preview).toContain("group: preview-db-migrations");
    expect(preview).toContain("cancel-in-progress: false");
    expect(preview).toContain("pnpm db:migrate:preview");
    expect(preview).toContain("pnpm db:seed:preview");
    expect(preview?.indexOf("pnpm db:seed:preview")).toBeGreaterThan(
      preview?.indexOf("pnpm db:migrate:preview") ?? -1,
    );
    expect(preview).toContain("secrets.DEMO_ADMIN_EMAIL");
    expect(preview).toContain("secrets.DEMO_ADMIN_PASSWORD");
  });

  it("rejects preview commands outside PRs and with mismatched targets", () => {
    const env = {
      ...process.env,
      DATABASE_URL: "postgresql://preview:fake@db.example.org:5432/bookclub",
      PREVIEW_MIGRATION_EXPECTED_HOST: "db.example.org",
      PREVIEW_MIGRATION_EXPECTED_PORT: "5432",
      PREVIEW_MIGRATION_EXPECTED_DATABASE: "bookclub",
      PREVIEW_MIGRATION_EXPECTED_USER: "preview",
      GITHUB_ACTIONS: "true",
      GITHUB_EVENT_NAME: "pull_request",
    };
    const run = (changes: Record<string, string>) =>
      spawnSync(
        process.execPath,
        [
          "node_modules/tsx/dist/cli.mjs",
          "scripts/run-env.ts",
          "preview",
          "-e",
          "process.exit(0)",
        ],
        { env: { ...env, ...changes }, encoding: "utf8" },
      );

    expect(run({}).status).toBe(0);
    const invalidEvents: Record<string, string>[] = [
      { GITHUB_EVENT_NAME: "push" },
      { GITHUB_ACTIONS: "" },
    ];
    for (const changes of invalidEvents) {
      const result = run(changes);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("restricted to GitHub pull requests");
    }
    const mismatch = run({
      PREVIEW_MIGRATION_EXPECTED_HOST: "other.example.org",
    });
    expect(mismatch.status).toBe(1);
    expect(mismatch.stderr).toContain(
      "independently configured preview target",
    );
    const missing = run({ DATABASE_URL: "" });
    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain("DATABASE_URL must be provided");
  }, 30000);

  it("orders migration, staged deployment, checks and promotion", () => {
    const steps = [
      "Check release is explicitly enabled",
      "Check commit is still main",
      "Validate migration target",
      "Apply pending migrations",
      "Build production deployment without promotion",
      "Verify deployment before promotion",
      "Promote tested deployment",
      "Verify and record publication",
    ];
    let previous = -1;
    for (const step of steps) {
      const position = release.indexOf(`name: ${step}`);
      expect(position).toBeGreaterThan(previous);
      previous = position;
    }
    expect(release).toContain("vercel deploy --prod --skip-domain");
    expect(release).not.toContain("continue-on-error:");
    expect(release).toContain('if [[ "$status" != "200" ]]');
  });

  it("prevents Git-based main deploys and serializes database operations", () => {
    expect(vercelConfig.git.deploymentEnabled.main).toBe(false);
    expect(release).toContain("group: production-db-and-release");
    expect(bootstrap).toContain("group: production-db-and-release");
    expect(release).toContain("cancel-in-progress: false");
    expect(bootstrap).toContain("cancel-in-progress: false");
  });
});
