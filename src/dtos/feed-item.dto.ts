import { z } from "zod";

export const feedItemSchema = z.object({
  id: z.string(),
  feedId: z.string(),
  title: z.string(),
  pubDate: z.string().datetime().optional().or(z.date().optional()),
  isRead: z.boolean().default(false),
  description: z.string().optional(),
  "content:encoded": z.string().optional(),
  htmlUrl: z.string().optional(),
  link: z.string().optional(),
  url: z.string().optional(),
  image: z.string().optional(),
  imageUrl: z.string().optional(),
  featuredImage: z.string().optional(),
  "media:content": z.any().optional(),
});

export type FeedItemDto = z.infer<typeof feedItemSchema>;
