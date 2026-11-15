import {
  type UpdateUserProfile,
  updateUserProfileSchema,
  userSchema,
} from "@repo/common";
import { and, db, eq, ilike, sql, users } from "@repo/db";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

const errorResponseSchema = z.object({
  statusCode: z.number(),
  error: z.string(),
  message: z.string(),
});

const userIdHeaderSchema = z.string().uuid();

/**
 * Resolves the authenticated user's ID from the incoming request.
 *
 * Uses the `x-user-id` header as an interim identity mechanism until
 * Better-Auth session middleware (#10) is integrated.
 *
 * @param request - Fastify request instance.
 * @returns Validated user UUID string, or `null` if unauthenticated/invalid.
 */
export function resolveAuthenticatedUserId(
  request: FastifyRequest,
): string | null {
  const headerValue = request.headers["x-user-id"];
  if (typeof headerValue !== "string") {
    return null;
  }

  const parsed = userIdHeaderSchema.safeParse(headerValue);
  return parsed.success ? parsed.data : null;
}

/**
 * Profile repository providing database queries for reading and updating
 * the authenticated user's developer profile.
 */
export const profileRepository = {
  /**
   * Builds the query checking whether a GitHub username is already claimed
   * by another user account.
   */
  buildGithubUsernameConflictQuery(
    githubUsername: string,
    excludeUserId: string,
  ) {
    return db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          ilike(users.githubUsername, githubUsername),
          sql`${users.id} <> ${excludeUserId}`,
        ),
      )
      .limit(1);
  },

  /**
   * Finds a user record by primary key UUID.
   *
   * @param userId - UUID of the user to retrieve.
   * @returns User record if found, otherwise `null`.
   */
  async findById(userId: string) {
    const user = await db.query.users.findFirst({
      where: { id: userId },
    });
    return user ?? null;
  },

  /**
   * Checks whether a GitHub username is already assigned to a different user.
   *
   * @param githubUsername - Candidate GitHub username.
   * @param excludeUserId - Current user's UUID to exclude from the check.
   * @returns `true` if another user already holds the username.
   */
  async isGithubUsernameTaken(
    githubUsername: string,
    excludeUserId: string,
  ): Promise<boolean> {
    const existing = await profileRepository.buildGithubUsernameConflictQuery(
      githubUsername,
      excludeUserId,
    );
    return existing.length > 0;
  },

  /**
   * Updates the current user's profile fields and refreshes `updatedAt`.
   *
   * @param userId - UUID of the user being updated.
   * @param data - Partial profile fields to update.
   * @returns Updated user record, or `null` if no matching user exists.
   */
  async updateProfile(userId: string, data: UpdateUserProfile) {
    const [updated] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return updated ?? null;
  },
};

/**
 * Route plugin exposing authenticated developer profile endpoints (`/profile/me`).
 *
 * @param app - Fastify instance on which profile routes are mounted.
 */
export const v1ProfileRoutes: FastifyPluginAsync = async (app) => {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/profile/me",
    {
      schema: {
        description:
          "Retrieve profile details for the currently authenticated user",
        tags: ["Profile"],
        response: {
          200: userSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = resolveAuthenticatedUserId(request);
      if (!userId) {
        return reply.unauthorized("Authentication required");
      }

      const user = await profileRepository.findById(userId);
      if (!user) {
        return reply.notFound("User profile not found");
      }

      return user;
    },
  );

  app.withTypeProvider<ZodTypeProvider>().put(
    "/profile/me",
    {
      schema: {
        description: "Update the currently authenticated user's profile",
        tags: ["Profile"],
        body: updateUserProfileSchema,
        response: {
          200: userSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = resolveAuthenticatedUserId(request);
      if (!userId) {
        return reply.unauthorized("Authentication required");
      }

      const { githubUsername } = request.body;
      if (githubUsername) {
        const taken = await profileRepository.isGithubUsernameTaken(
          githubUsername,
          userId,
        );
        if (taken) {
          return reply.conflict("GitHub username is already in use");
        }
      }

      const updated = await profileRepository.updateProfile(
        userId,
        request.body,
      );
      if (!updated) {
        return reply.notFound("User profile not found");
      }

      return updated;
    },
  );
};
