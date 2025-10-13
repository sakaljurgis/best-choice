import { query } from './pool.js';

const projectColumns = `
  id,
  name,
  description,
  status,
  project_attributes,
  project_priority_rules,
  created_at,
  updated_at
`;

export interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'archived';
  project_attributes: string[];
  project_priority_rules: unknown;
  created_at: Date;
  updated_at: Date;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'archived';
  attributes: string[];
  priorityRules: unknown;
  createdAt: string;
  updatedAt: string;
}

const mapProjectRow = (row: ProjectRow): Project => ({
  id: row.id,
  name: row.name,
  description: row.description,
  status: row.status,
  attributes: row.project_attributes ?? [],
  priorityRules: row.project_priority_rules ?? [],
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString()
});

export interface ListProjectsOptions {
  limit: number;
  offset: number;
  status?: 'active' | 'archived';
}

export const listProjects = async (
  options: ListProjectsOptions
): Promise<Project[]> => {
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (options.status) {
    params.push(options.status);
    conditions.push(`status = $${params.length}`);
  }

  params.push(options.limit);
  const limitParamIndex = params.length;
  params.push(options.offset);
  const offsetParamIndex = params.length;

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query<ProjectRow>(
    `
      SELECT ${projectColumns}
      FROM projects
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${limitParamIndex}
      OFFSET $${offsetParamIndex}
    `,
    params
  );

  return result.rows.map(mapProjectRow);
};

export interface CreateProjectParams {
  name: string;
  description: string | null;
  status: 'active' | 'archived';
  attributes: string[];
  priorityRules: unknown;
}

export const createProject = async (params: CreateProjectParams): Promise<Project> => {
  const result = await query<ProjectRow>(
    `
      INSERT INTO projects (
        name,
        description,
        status,
        project_attributes,
        project_priority_rules
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING ${projectColumns}
    `,
    [
      params.name,
      params.description,
      params.status,
      params.attributes,
      params.priorityRules ?? []
    ]
  );

  return mapProjectRow(result.rows[0]);
};

export const getProjectById = async (id: string): Promise<Project | null> => {
  const result = await query<ProjectRow>(
    `
      SELECT ${projectColumns}
      FROM projects
      WHERE id = $1
    `,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapProjectRow(result.rows[0]);
};

export interface UpdateProjectParams {
  name?: string;
  description?: string | null;
  status?: 'active' | 'archived';
  attributes?: string[];
  priorityRules?: unknown;
}

export const updateProject = async (
  id: string,
  params: UpdateProjectParams
): Promise<Project | null> => {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (params.name !== undefined) {
    values.push(params.name);
    fields.push(`name = $${values.length}`);
  }

  if (params.description !== undefined) {
    values.push(params.description);
    fields.push(`description = $${values.length}`);
  }

  if (params.status !== undefined) {
    values.push(params.status);
    fields.push(`status = $${values.length}`);
  }

  if (params.attributes !== undefined) {
    values.push(params.attributes);
    fields.push(`project_attributes = $${values.length}`);
  }

  if (params.priorityRules !== undefined) {
    values.push(params.priorityRules);
    fields.push(`project_priority_rules = $${values.length}`);
  }

  if (fields.length === 0) {
    return getProjectById(id);
  }

  values.push(id);
  const idParamIndex = values.length;

  const result = await query<ProjectRow>(
    `
      UPDATE projects
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${idParamIndex}
      RETURNING ${projectColumns}
    `,
    values
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapProjectRow(result.rows[0]);
};

export const deleteProject = async (id: string): Promise<boolean> => {
  const result = await query(
    `
      DELETE FROM projects
      WHERE id = $1
    `,
    [id]
  );

  return (result.rowCount ?? 0) > 0;
};
