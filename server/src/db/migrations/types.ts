import type { ClientBase } from 'pg';

export interface Migration {
  name: string;
  up: (client: ClientBase) => Promise<void>;
}
