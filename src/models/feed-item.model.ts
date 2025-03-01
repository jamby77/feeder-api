export class FeedItem {
  id: string;
  feedId: string;
  title: string;
  pubDate: Date;
  isRead: boolean;
  description?: string;
  link?: string;
  url?: string;
  image?: string;
}
