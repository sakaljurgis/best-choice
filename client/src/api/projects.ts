import { apiFetch } from './http-client';

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

interface ListResponseMeta {
  limit: number;
  offset: number;
  count: number;
}

export interface ProjectsListResponse {
  data: Project[];
  meta: ListResponseMeta;
}

export interface FetchProjectsParams {
  limit?: number;
  offset?: number;
  status?: ProjectStatus;
  signal?: AbortSignal;
}

export const fetchProjects = async (
  params: FetchProjectsParams = {}
): Promise<ProjectsListResponse> => {
  const searchParams = new URLSearchParams();

  if (params.limit !== undefined) {
    searchParams.set('limit', String(params.limit));
  }

  if (params.offset !== undefined) {
    searchParams.set('offset', String(params.offset));
  }

  if (params.status) {
    searchParams.set('status', params.status);
  }

  const query = searchParams.toString();
  const path = query ? `/projects?${query}` : '/projects';

  return apiFetch<ProjectsListResponse>(path, { signal: params.signal });
};

export interface CreateProjectPayload {
  name: string;
  description?: string | null;
  status?: ProjectStatus;
  attributes?: string[];
  priorityRules?: unknown;
}

interface SingleProjectResponse {
  data: Project;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
  attributes?: string[];
  priorityRules?: unknown;
}

export const createProject = async (
  payload: CreateProjectPayload
): Promise<Project> => {
  const response = await apiFetch<SingleProjectResponse>('/projects', {
    method: 'POST',
    body: {
      name: payload.name,
      description: payload.description ?? null,
      status: payload.status ?? undefined,
      attributes: payload.attributes ?? [],
      priorityRules: payload.priorityRules ?? []
    }
  });

  return response.data;
};

export interface FetchProjectParams {
  signal?: AbortSignal;
}

export const fetchProject = async (
  projectId: string,
  params: FetchProjectParams = {}
): Promise<Project> => {
  const response = await apiFetch<SingleProjectResponse>(
    `/projects/${projectId}`,
    { signal: params.signal }
  );

  return response.data;
};

export const updateProject = async (
  projectId: string,
  payload: UpdateProjectPayload
): Promise<Project> => {
  const response = await apiFetch<SingleProjectResponse>(`/projects/${projectId}`, {
    method: 'PATCH',
    body: payload
  });

  return response.data;
};
