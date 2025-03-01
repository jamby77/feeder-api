import { z } from 'zod';

export const commands = {
  next: 'Next Item',
  prev: 'Previous Item',
  nextUnread: 'Next Unread Item',
  prevUnread: 'Previous Unread Item',
  toggleNewOnTop: 'Toggle New On Top',
  toggleHideRead: 'Toggle Hide Read',
  toggleHideEmptyCategories: 'Toggle Hide Empty Categories',
  toggleHideEmptyFeeds: 'Toggle Hide Empty Feeds',
  refresh: 'Refresh',
  visitSite: 'Visit Site',
};

export type Command = keyof typeof commands;

export const DEFAULT_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

export const appConfigSchema = z.object({
  title: z.string(),
  refreshInterval: z.number().default(DEFAULT_REFRESH_INTERVAL),
  lastRefresh: z.string().date().optional(),
  newOnTop: z.boolean().default(false),
  hideRead: z.boolean().default(false),
  hideEmptyCategories: z.boolean().default(false),
  hideEmptyFeeds: z.boolean().default(false),
  enableShortcuts: z.boolean().default(false),
  shortcuts: z
    .array(
      z.object({
        key: z.string(),
        title: z.string().optional(),
        altKey: z.boolean().optional(),
        ctrlKey: z.boolean().optional(),
        metaKey: z.boolean().optional(),
        shiftKey: z.boolean().optional(),
        command: z.enum(Object.keys(commands) as [Command]),
      }),
    )
    .optional(),
});

export type AppConfigDto = z.infer<typeof appConfigSchema>;
