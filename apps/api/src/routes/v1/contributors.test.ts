import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { buildApp } from "../../app";
import { contributorRepository } from "./contributors";

process.env.NODE_ENV = "test";

const FAKE_CONTRIBUTOR = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  username: "octocat",
  displayName: "Mona Octocat",
  bio: "Open source contributor on Project Camp.",
  githubUsername: "octocat",
  website: "https://github.com/octocat",
  reputationScore: 120,
  projects: [
    {
      id: "123e4567-e89b-12d3-a456-426614174001",
      slug: "project-camp-platform",
      title: "Project Camp Platform",
      role: "owner" as const,
    },
    {
      id: "123e4567-e89b-12d3-a456-426614174002",
      slug: "cli-helper",
      title: "CLI Helper",
      role: "contributor" as const,
    },
  ],
};

describe("v1ContributorRoutes", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("GET /api/v1/contributors/:username returns 200 with public contributor profile", async () => {
    let capturedUsername: string | undefined;
    mock.method(
      contributorRepository,
      "findByUsername",
      async (username: string) => {
        capturedUsername = username;
        return FAKE_CONTRIBUTOR;
      },
    );

    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/contributors/octocat",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(capturedUsername, "octocat");
    const body = JSON.parse(response.payload);
    assert.equal(body.id, FAKE_CONTRIBUTOR.id);
    assert.equal(body.username, "octocat");
    assert.equal(body.displayName, "Mona Octocat");
    assert.equal(body.reputationScore, 120);
    assert.equal(body.projects.length, 2);
    assert.equal(body.projects[0].slug, "project-camp-platform");
    assert.equal(body.projects[0].role, "owner");
  });

  it("GET /api/v1/contributors/:username returns 404 when contributor is not found", async () => {
    mock.method(contributorRepository, "findByUsername", async () => null);

    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/contributors/nonexistent-user",
    });

    assert.equal(response.statusCode, 404);
    const body = JSON.parse(response.payload);
    assert.equal(body.statusCode, 404);
    assert.equal(body.message, "Contributor not found");
  });

  it("GET /api/v1/contributors/:username returns 400 for invalid GitHub username format", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/contributors/-invalid-username-",
    });

    assert.equal(response.statusCode, 400);
  });

  it("builds contributor user and project queries with expected SQL filters", () => {
    const userQuery = contributorRepository
      .buildFindUserByUsernameQuery("octocat")
      .toSQL();
    assert.ok(userQuery.sql.includes('"users"."github_username" ilike $1'));
    assert.deepEqual(userQuery.params, ["octocat", 1]);

    const memberProjectsQuery = contributorRepository
      .buildFindMemberProjectsQuery(FAKE_CONTRIBUTOR.id)
      .toSQL();
    assert.ok(
      memberProjectsQuery.sql.includes('"project_members"."user_id" = $1'),
    );
    assert.ok(
      memberProjectsQuery.sql.includes('"project_members"."status" = $2'),
    );
    assert.deepEqual(memberProjectsQuery.params, [
      FAKE_CONTRIBUTOR.id,
      "accepted",
    ]);
  });
});
