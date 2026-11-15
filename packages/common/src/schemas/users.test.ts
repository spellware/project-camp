import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  contributorProfileSchema,
  contributorUsernameParamsSchema,
  insertUserSchema,
  updateUserProfileSchema,
  userSchema,
} from "./users";

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";
const VALID_PROJECT_UUID = "123e4567-e89b-12d3-a456-426614174001";

describe("Users & Contributor Schemas", () => {
  it("validates a complete user entity", () => {
    const now = new Date().toISOString();
    const valid = {
      id: VALID_UUID,
      email: "camper@freecodecamp.org",
      name: "Camper Bot",
      role: "contributor",
      bio: "Building open source projects.",
      githubUsername: "camper-bot",
      website: "https://freecodecamp.org",
      reputationScore: 100,
      createdAt: now,
      updatedAt: now,
    };

    const parsed = userSchema.parse(valid);
    assert.equal(parsed.id, VALID_UUID);
    assert.equal(parsed.githubUsername, "camper-bot");
    assert.equal(parsed.role, "contributor");
    assert.ok(parsed.createdAt instanceof Date);
  });

  it("validates insertUserSchema omitting generated fields", () => {
    const parsed = insertUserSchema.parse({
      email: "new@freecodecamp.org",
      name: "New Camper",
    });

    assert.equal(parsed.email, "new@freecodecamp.org");
    assert.equal(parsed.role, "member");
  });

  it("validates updateUserProfileSchema partial fields and rejects invalid githubUsername", () => {
    const valid = updateUserProfileSchema.parse({
      bio: "Updated bio",
      githubUsername: "octocat-123",
    });
    assert.equal(valid.bio, "Updated bio");
    assert.equal(valid.githubUsername, "octocat-123");

    assert.throws(() =>
      updateUserProfileSchema.parse({
        githubUsername: "-invalid-leading-hyphen",
      }),
    );

    assert.throws(() =>
      updateUserProfileSchema.parse({
        githubUsername: "invalid--double-hyphen",
      }),
    );
  });

  it("validates contributorUsernameParamsSchema", () => {
    const parsed = contributorUsernameParamsSchema.parse({
      username: "octocat",
    });
    assert.equal(parsed.username, "octocat");

    assert.throws(() =>
      contributorUsernameParamsSchema.parse({
        username: "-bad-username-",
      }),
    );
  });

  it("validates contributorProfileSchema with associated projects", () => {
    const parsed = contributorProfileSchema.parse({
      id: VALID_UUID,
      username: "octocat",
      displayName: "Mona Octocat",
      bio: null,
      githubUsername: "octocat",
      website: "https://github.com/octocat",
      reputationScore: 42,
      projects: [
        {
          id: VALID_PROJECT_UUID,
          slug: "project-camp",
          title: "Project Camp",
          role: "owner",
        },
      ],
    });

    assert.equal(parsed.username, "octocat");
    assert.equal(parsed.projects.length, 1);
    assert.equal(parsed.projects[0]?.role, "owner");
  });
});
