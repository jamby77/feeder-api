import { Shortcut } from '../models/shorcut.model';

export class CreateConfigDto {
  title: string;
  refreshInterval: number;
  newOnTop: boolean;
  hideRead: boolean;
  hideEmptyCategories: boolean;
  hideEmptyFeeds: boolean;
  enableShortcuts: boolean;
  shortcuts: Shortcut[];
}
