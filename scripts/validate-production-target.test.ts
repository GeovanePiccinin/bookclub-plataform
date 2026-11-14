import { describe, expect, it } from "vitest";

import {
  validatePreviewTarget,
  validateProductionTarget,
} from "./validate-production-target";

const valid = {
  DATABASE_URL:
    "postgresql://migration.user:secret@db.example.org:5432/bookclub",
  MIGRATION_EXPECTED_HOST: "db.example.org",
  MIGRATION_EXPECTED_PORT: "5432",
  MIGRATION_EXPECTED_DATABASE: "bookclub",
  MIGRATION_EXPECTED_USER: "migration.user",
};

describe("production migration target", () => {
  it("accepts the independently configured target", () => {
    expect(() => validateProductionTarget(valid)).not.toThrow();
  });

  it.each([
    { DATABASE_URL: "" },
    { DATABASE_URL: "not-a-url" },
    { DATABASE_URL: `${valid.DATABASE_URL}?schema=other` },
    { MIGRATION_EXPECTED_HOST: "other.example.org" },
    { MIGRATION_EXPECTED_PORT: "6543" },
    { MIGRATION_EXPECTED_DATABASE: "other" },
    { MIGRATION_EXPECTED_USER: "another-project" },
    { MIGRATION_EXPECTED_USER: "" },
    {
      DATABASE_URL:
        "postgresql://migration.user:secret@127.0.0.1:5432/bookclub",
      MIGRATION_EXPECTED_HOST: "127.0.0.1",
    },
    {
      DATABASE_URL:
        "postgresql://migration.user:secret@db.example.org:5432/bookclub_test",
      MIGRATION_EXPECTED_DATABASE: "bookclub_test",
    },
  ])("rejects mismatched or unsafe targets", (changes) => {
    expect(() => validateProductionTarget({ ...valid, ...changes })).toThrow();
  });

  describe("preview migration target", () => {
    const preview = {
      DATABASE_URL: valid.DATABASE_URL,
      PREVIEW_MIGRATION_EXPECTED_HOST: valid.MIGRATION_EXPECTED_HOST,
      PREVIEW_MIGRATION_EXPECTED_PORT: valid.MIGRATION_EXPECTED_PORT,
      PREVIEW_MIGRATION_EXPECTED_DATABASE: valid.MIGRATION_EXPECTED_DATABASE,
      PREVIEW_MIGRATION_EXPECTED_USER: valid.MIGRATION_EXPECTED_USER,
    };

    it("accepts an independently configured remote preview target", () => {
      expect(() => validatePreviewTarget(preview)).not.toThrow();
      expect(() => validatePreviewTarget(valid)).toThrow();
    });

    it.each([
      { PREVIEW_MIGRATION_EXPECTED_HOST: "" },
      { PREVIEW_MIGRATION_EXPECTED_PORT: "6543" },
      { PREVIEW_MIGRATION_EXPECTED_DATABASE: "other" },
      { PREVIEW_MIGRATION_EXPECTED_USER: "other" },
      {
        DATABASE_URL:
          "postgresql://migration.user:secret@localhost:5432/bookclub",
        PREVIEW_MIGRATION_EXPECTED_HOST: "localhost",
      },
      {
        DATABASE_URL:
          "postgresql://migration.user:secret@db.example.org:5432/bookclub_test",
        PREVIEW_MIGRATION_EXPECTED_DATABASE: "bookclub_test",
      },
    ])("rejects missing, mismatched or unsafe targets", (changes) => {
      expect(() => validatePreviewTarget({ ...preview, ...changes })).toThrow();
    });
  });
});
