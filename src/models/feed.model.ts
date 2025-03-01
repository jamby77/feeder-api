export class Feed {
  id: string;
  type: string;
  title: string;
  xmlUrl: string;
  htmlUrl?: string;
  text?: string;
  categories?: string[];
  lastUpdated?: Date;
}
