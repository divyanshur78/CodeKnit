import { z } from "zod";

export const wsTicketSchema = z.object({
  projectId: z
    .string()
    .uuid("A valid project ID is required")
});
