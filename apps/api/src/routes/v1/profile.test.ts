import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import type { UpdateUserProfile } from "@repo/common";
import { buildApp } from "../../app";
import { profileRepository } from "./profile";

process.env.NODE_ENV = "test";

const FAKE_USER_ID = "123e4567-e89b-12d3-a456-426614174000";

const FAKE_USER = {
  id: FAKE_USER_ID,
  email: "camper@freecodecamp.org",
  name: "Camper Bot",
  role: "contributor" as const,
  bio: "Open source contributor.",
  githubUsername: "camperbot",
  website: "https://freecodecamp.org",
  reputationScore: 42,
  createdAt: new Date("2026-10-18T12:00:00Z"),
  updatedAt: new Date("2026-10-18T12:00:00Z"),
};

describe("v1ProfileRoutes", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("GET /api/v1/profile/me returns 200 with user profile when authenticated", async () => {
    mock.method(profileRepository, "findById", async () => FAKE_USER);

    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/profile/me",
      headers: {
        "x-user-id": FAKE_USER_ID,
      },
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.payload);
    assert.equal(body.id, FAKE_USER.id);
    assert.equal(body.email, FAKE_USER.email);
    assert.equal(body.name, FAKE_USER.name);
    assert.equal(body.githubUsername, FAKE_USER.githubUsername);
    assert.equal(body.reputationScore, FAKE_USER.reputationScore);
  });

  it("GET /api/v1/profile/me returns 401 when x-user-id header is missing or invalid", async () => {
    const app = await buildApp();

    const missingResponse = await app.inject({
      method: "GET",
      url: "/api/v1/profile/me",
    });
    assert.equal(missingResponse.statusCode, 401);

    const invalidResponse = await app.inject({
      method: "GET",
      url: "/api/v1/profile/me",
      headers: {
        "x-user-id": "not-a-uuid",
      },
    });
    assert.equal(invalidResponse.statusCode, 401);
  });

  it("GET /api/v1/profile/me returns 404 when user record does not exist", async () => {
    mock.method(profileRepository, "findById", async () => null);

    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/profile/me",
      headers: {
        "x-user-id": FAKE_USER_ID,
      },
    });

    assert.equal(response.statusCode, 404);
    const body = JSON.parse(response.payload);
    assert.equal(body.message, "User profile not found");
  });

  it("PUT /api/v1/profile/me updates and returns 200 with updated profile", async () => {
    mock.method(profileRepository, "isGithubUsernameTaken", async () => false);
    mock.method(
      profileRepository,
      "updateProfile",
      async (_userId: string, data: UpdateUserProfile) => ({
        ...FAKE_USER,
        ...data,
      }),
    );

    const app = await buildApp();
    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/profile/me",
      headers: {
        "x-user-id": FAKE_USER_ID,
      },
      payload: {
        name: "Updated Camper",
        bio: "Building Project Camp",
        githubUsername: "updated-camper",
        website: "https://example.org",
      },
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.payload);
    assert.equal(body.name, "Updated Camper");
    assert.equal(body.bio, "Building Project Camp");
    assert.equal(body.githubUsername, "updated-camper");
    assert.equal(body.website, "https://example.org");
  });

  it("PUT /api/v1/profile/me returns 409 when githubUsername is already taken", async () => {
    mock.method(profileRepository, "isGithubUsernameTaken", async () => true);

    const app = await buildApp();
    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/profile/me",
      headers: {
        "x-user-id": FAKE_USER_ID,
      },
      payload: {
        githubUsername: "octocat",
      },
    });

    assert.equal(response.statusCode, 409);
    const body = JSON.parse(response.payload);
    assert.equal(body.message, "GitHub username is already in use");
  });

  it("PUT /api/v1/profile/me returns 400 on invalid payload", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/profile/me",
      headers: {
        "x-user-id": FAKE_USER_ID,
      },
      payload: {
        githubUsername: "-invalid-username-",
      },
    });

    assert.equal(response.statusCode, 400);
  });

  it("PUT /api/v1/profile/me returns 401 when unauthenticated", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/profile/me",
      payload: {
        bio: "Updated bio",
      },
    });

    assert.equal(response.statusCode, 401);
  });

  it("builds case-insensitive GitHub username conflict query excluding current user", () => {
    const { sql, params } = profileRepository
      .buildGithubUsernameConflictQuery("octocat", FAKE_USER_ID)
      .toSQL();

    assert.ok(sql.includes('"users"."github_username" ilike $1'));
    assert.ok(sql.includes('"users"."id" <> $2'));
    assert.deepEqual(params, ["octocat", FAKE_USER_ID, 1]);
  });
});
