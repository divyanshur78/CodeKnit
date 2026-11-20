
import { z } from "zod";

export const addMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .max(255)
    .transform((value) => value.toLowerCase()),

  role: z.enum(["editor", "viewer"]).default("editor")
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["editor", "viewer"])
});
