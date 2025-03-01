import { Command } from '../schema/app-config.schema';

export class Shortcut {
  key: string;
  title: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  command: Command;
}
