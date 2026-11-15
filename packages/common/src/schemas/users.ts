import { z } from "zod";
import { projectMemberRoleSchema, userRoleSchema } from "../enums/index";

/**
 * Zod validation schema for a valid GitHub username (alphanumeric + single hyphens, 1-39 chars).
 */
export const githubUsernameSchema = z
  .string()
  .regex(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i, "Invalid GitHub username");

/**
 * Zod validation schema representing a full user account and developer profile.
 */
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1, "Name is required").max(100),
  role: userRoleSchema.default("member"),
  bio: z.string().max(500).nullable().optional(),
  githubUsername: githubUsernameSchema.nullable().optional(),
  website: z.string().url().nullable().optional(),
  reputationScore: z.number().int().nonnegative().default(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/**
 * User model representing a registered platform user.
 */
export type User = z.infer<typeof userSchema>;

/**
 * Zod validation schema for creating a new user record.
 */
export const insertUserSchema = userSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reputationScore: true,
});

/**
 * Payload required to insert a new user record.
 */
export type InsertUser = z.infer<typeof insertUserSchema>;

/**
 * Zod validation schema for updating an existing user's public developer profile.
 */
export const updateUserProfileSchema = userSchema
  .pick({
    name: true,
    bio: true,
    githubUsername: true,
    website: true,
  })
  .partial();

/**
 * Payload required to update a developer's profile.
 */
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;

/**
 * Zod validation schema for contributor lookup route parameters.
 */
export const contributorUsernameParamsSchema = z.object({
  username: githubUsernameSchema,
});

/**
 * Route parameter payload for querying a contributor by username.
 */
export type ContributorUsernameParams = z.infer<
  typeof contributorUsernameParamsSchema
>;

/**
 * Zod validation schema representing a project summary on a public contributor profile.
 */
export const contributorProjectSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  role: projectMemberRoleSchema,
});

/**
 * Project membership summary displayed on a contributor's public showcase page.
 */
export type ContributorProject = z.infer<typeof contributorProjectSchema>;

/**
 * Zod validation schema for a public read-only contributor profile response.
 */
export const contributorProfileSchema = z.object({
  id: z.string().uuid(),
  username: githubUsernameSchema,
  displayName: z.string().min(1).max(100),
  bio: z.string().max(500).nullable(),
  githubUsername: githubUsernameSchema,
  website: z.string().url().nullable(),
  reputationScore: z.number().int().nonnegative(),
  projects: z.array(contributorProjectSchema),
});

/**
 * Public contributor profile payload returned by `GET /api/v1/contributors/:username`.
 */
export type ContributorProfile = z.infer<typeof contributorProfileSchema>;
