import {
  type ContributorProfile,
  type ContributorProject,
  contributorProfileSchema,
  contributorUsernameParamsSchema,
} from "@repo/common";
import {
  and,
  asc,
  db,
  eq,
  ilike,
  projectMembers,
  projects,
  users,
} from "@repo/db";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

const notFoundResponseSchema = z.object({
  statusCode: z.number(),
  error: z.string(),
  message: z.string(),
});

/**
 * Contributor repository providing read-only queries for public contributor profiles
 * and their associated projects.
 */
export const contributorRepository = {
  /**
   * Builds the query to look up a user by GitHub username (case-insensitive).
   */
  buildFindUserByUsernameQuery(username: string) {
    return db
      .select()
      .from(users)
      .where(ilike(users.githubUsername, username))
      .limit(1);
  },

  /**
   * Builds the query to retrieve accepted project memberships for a contributor.
   */
  buildFindMemberProjectsQuery(userId: string) {
    return db
      .select({
        id: projects.id,
        slug: projects.slug,
        title: projects.title,
        role: projectMembers.role,
      })
      .from(projectMembers)
      .innerJoin(projects, eq(projectMembers.projectId, projects.id))
      .where(
        and(
          eq(projectMembers.userId, userId),
          eq(projectMembers.status, "accepted"),
        ),
      )
      .orderBy(asc(projects.title));
  },

  /**
   * Builds the query to retrieve projects owned directly by a contributor.
   */
  buildFindOwnedProjectsQuery(userId: string) {
    return db
      .select({
        id: projects.id,
        slug: projects.slug,
        title: projects.title,
      })
      .from(projects)
      .where(eq(projects.ownerId, userId))
      .orderBy(asc(projects.title));
  },

  /**
   * Retrieves a public contributor profile and their active projects by GitHub username.
   *
   * @param username - Contributor's GitHub username slug.
   * @returns Public contributor profile or `null` if not found.
   */
  async findByUsername(username: string): Promise<ContributorProfile | null> {
    const [user] =
      await contributorRepository.buildFindUserByUsernameQuery(username);

    if (!user || !user.githubUsername) {
      return null;
    }

    const [ownedProjects, memberProjects] = await Promise.all([
      contributorRepository.buildFindOwnedProjectsQuery(user.id),
      contributorRepository.buildFindMemberProjectsQuery(user.id),
    ]);

    const projectMap = new Map<string, ContributorProject>();

    for (const owned of ownedProjects) {
      projectMap.set(owned.id, {
        id: owned.id,
        slug: owned.slug,
        title: owned.title,
        role: "owner",
      });
    }

    for (const member of memberProjects) {
      if (!projectMap.has(member.id)) {
        projectMap.set(member.id, {
          id: member.id,
          slug: member.slug,
          title: member.title,
          role: member.role,
        });
      }
    }

    return {
      id: user.id,
      username: user.githubUsername,
      displayName: user.name,
      bio: user.bio ?? null,
      githubUsername: user.githubUsername,
      website: user.website ?? null,
      reputationScore: user.reputationScore,
      projects: Array.from(projectMap.values()),
    };
  },
};

/**
 * Route plugin exposing public read-only contributor profile endpoints.
 *
 * @param app - Fastify instance on which contributor routes are mounted.
 */
export const v1ContributorRoutes: FastifyPluginAsync = async (app) => {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/contributors/:username",
    {
      schema: {
        description:
          "Retrieve a public contributor profile and associated projects by username",
        tags: ["Contributors"],
        params: contributorUsernameParamsSchema,
        response: {
          200: contributorProfileSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { username } = request.params;
      const contributor = await contributorRepository.findByUsername(username);

      if (!contributor) {
        return reply.notFound("Contributor not found");
      }

      return contributor;
    },
  );
};
