/**
 * @vitest-environment node
 */

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
