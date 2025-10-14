export type ProjectStatus = 'active' | 'archived';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  attributes: string[];
  priorityRules: unknown;
  createdAt: string;
  updatedAt: string;
}
