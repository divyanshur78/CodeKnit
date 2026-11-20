
import { z } from "zod";

// Registration validation
export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .max(255)
    .transform((value) => value.toLowerCase()),

  displayName: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters")
    .max(100),

  password: z
    .string()
    .min(8, "Password must contain at least 8 characters")
    .max(72, "Password is too long")
});

// Login validation
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .max(255)
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(1, "Password is required")
});
