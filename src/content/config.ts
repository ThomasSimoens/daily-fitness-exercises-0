import { defineCollection, z } from "astro:content";

const referenceUrlSchema = z.object({
  label: z.string(),
  url: z.string().regex(/^https?:\/\//, "URL must start with http:// or https://"),
  type: z.enum(["video", "article", "gif", "image"]),
});

const exerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  phases: z.array(z.enum(["warmup", "main", "accessory", "cooldown"])),
  primary_muscle_group: z.enum(["arms", "chest", "back", "shoulders", "core", "legs", "full_body"]),
  target_muscles: z.array(z.string()),
  movement_pattern: z.enum(["push", "pull", "hinge", "squat", "lunge", "carry", "rotation", "none"]),
  is_isometric: z.boolean(),
  is_unilateral: z.boolean(),
  plane_of_motion: z.enum(["sagittal", "frontal", "transverse"]),
  equipment_required: z.array(z.string()),
  equipment_optional: z.array(z.string()),
  fatigue_score: z.number().int().min(1).max(5),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  primary_metric: z.enum(["reps", "time", "distance"]),
  regression_id: z.string().nullable().optional(),
  progression_id: z.string().nullable().optional(),
  reference_urls: z.array(referenceUrlSchema).optional().default([]),
});

const usersCollection = defineCollection({
  type: "content",
  schema: z.object({
    userId: z.string(),
    displayName: z.string(),
    exercises: z.array(exerciseSchema),
  }),
});

export const collections = {
  users: usersCollection,
};