
import { z } from "zod";

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Project name must contain at least 2 characters")
    .max(150, "Project name cannot exceed 150 characters")
});

export const updateProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Project name must contain at least 2 characters")
    .max(150, "Project name cannot exceed 150 characters")
}).refine(
  (data) => Object.keys(data).length > 0,
  "At least one field is required"
);
