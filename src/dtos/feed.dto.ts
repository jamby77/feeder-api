import { z } from "zod";

export const feedSchema = z.object({
  title: z.string(),
  xmlUrl: z.string(),
  htmlUrl: z.string().optional(),
  text: z.string().optional(),
  categories: z.array(z.string()).optional(),
  lastUpdated: z.string().datetime().optional(),
});

export type FeedDto = z.infer<typeof feedSchema>;
