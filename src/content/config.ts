import { defineCollection, z } from "astro:content";

const usersCollection = defineCollection({
  type: "content",
  schema: z.object({
    userId: z.string(),
    displayName: z.string(),
    exercises: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        target: z.string(),
        days: z.array(
          z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])
        ),
      })
    ),
  }),
});

export const collections = {
  users: usersCollection,
};