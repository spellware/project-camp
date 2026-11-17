import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { skills } from "../src/schemas/skills";
import { relations } from "../src/schemas/relations";
import "dotenv/config";

const techLangs = [
  {
    name: "Typescript",
    slug: "typescript",
    category: "languages",
    description: "Typescript",
  },
  {
    name: "Javascript",
    slug: "javascript",
    category: "languages",
    description: "Javascript",
  },
  {
    name: "Python",
    slug: "python",
    category: "languages",
    description: "Python",
  },
  { name: "Go", slug: "go", category: "languages", description: "Go" },
  { name: "Rust", slug: "rust", category: "languages", description: "Rust" },
  { name: "Java", slug: "java", category: "languages", description: "Java" },
  { name: "C++", slug: "cplusplus", category: "languages", description: "C++" },
  { name: "Ruby", slug: "ruby", category: "languages", description: "Ruby" },
];

const techFrameworks = [
  {
    name: "Next.js",
    slug: "nextjs",
    category: "frameworks",
    description: "Next.js",
  },
  {
    name: "React",
    slug: "react",
    category: "frameworks",
    description: "React",
  },
  {
    name: "Fastify",
    slug: "fastify",
    category: "frameworks",
    description: "Fastify",
  },
  {
    name: "Express",
    slug: "express",
    category: "frameworks",
    description: "Express",
  },
  {
    name: "Vue.js",
    slug: "vuejs",
    category: "frameworks",
    description: "Vue.js",
  },
  {
    name: "Svelte",
    slug: "svelte",
    category: "frameworks",
    description: "Svelte",
  },
  {
    name: "NestJS",
    slug: "nestjs",
    category: "frameworks",
    description: "NestJS",
  },
  {
    name: "Django",
    slug: "django",
    category: "frameworks",
    description: "Django",
  },
  {
    name: "Spring Boot",
    slug: "spring-boot",
    category: "frameworks",
    description: "Spring Boot",
  },
];

const databases = [
  {
    name: "PostgreSQL",
    slug: "postgres",
    category: "databases",
    description: "PostgreSQL",
  },
  {
    name: "MongoDB",
    slug: "mongodb",
    category: "databases",
    description: "MongoDB",
  },
  { name: "Redis", slug: "redis", category: "databases", description: "Redis" },
  {
    name: "SQLite",
    slug: "sqlite",
    category: "databases",
    description: "SQLite",
  },
  { name: "MySQL", slug: "mysql", category: "databases", description: "MySQL" },
];

const devops = [
  { name: "Docker", slug: "docker", category: "devops", description: "Docker" },
  {
    name: "GitHub Actions",
    slug: "github-actions",
    category: "devops",
    description: "GitHub Actions",
  },
  {
    name: "Tailwind CSS",
    slug: "tailwind-css",
    category: "devops",
    description: "Tailwind CSS",
  },
  {
    name: "GraphQL",
    slug: "graphql",
    category: "devops",
    description: "GraphQL",
  },
  {
    name: "Drizzle ORM",
    slug: "drizzle-orm",
    category: "devops",
    description: "Drizzle ORM",
  },
  { name: "Prisma", slug: "prisma", category: "devops", description: "Prisma" },
];

const main = async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "",
  });

  const db = drizzle({ client: pool, relations });

  await db.insert(skills).values(techLangs).onConflictDoNothing();
  await db.insert(skills).values(techFrameworks).onConflictDoNothing();
  await db.insert(skills).values(databases).onConflictDoNothing();
  await db.insert(skills).values(devops).onConflictDoNothing();
  await pool.end();
};

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    console.log("Seeding done!");
    process.exit(0);
  });
