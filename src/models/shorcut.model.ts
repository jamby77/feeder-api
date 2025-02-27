import { Command } from '../app.service';

export class Shortcut {
  key: string;
  title: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  command: Command;
}
