import {
  createProject,
  fetchProject,
  fetchProjects,
  updateProject,
  type CreateProjectPayload,
  type Project,
  type ProjectsListResponse,
  type UpdateProjectPayload
} from '../api/projects';
import {
  createItem,
  fetchProjectItems,
  type CreateItemPayload,
  type ProjectItemsResponse
} from '../api/items';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const DEFAULT_LIMIT = 50;

export const projectsKeys = {
  all: ['projects'] as const,
  list: () => [...projectsKeys.all, 'list'] as const,
  detail: (projectId: string) =>
    [...projectsKeys.all, 'detail', projectId] as const,
  items: (projectId: string) =>
    [...projectsKeys.detail(projectId), 'items'] as const
};

export const useProjectsQuery = () =>
  useQuery<ProjectsListResponse>({
    queryKey: projectsKeys.list(),
    queryFn: ({ signal }) => fetchProjects({ limit: DEFAULT_LIMIT, offset: 0, signal })
  });

export const useProjectQuery = (projectId: string | undefined) =>
  useQuery<Project>({
    queryKey: projectId ? projectsKeys.detail(projectId) : ['project', 'missing'],
    enabled: Boolean(projectId),
    queryFn: ({ signal }) => fetchProject(projectId!, { signal })
  });

export const useProjectItemsQuery = (projectId: string | undefined) =>
  useQuery<ProjectItemsResponse>({
    queryKey: projectId ? projectsKeys.items(projectId) : ['project', 'items', 'missing'],
    enabled: Boolean(projectId),
    queryFn: ({ signal }) =>
      fetchProjectItems(projectId!, { limit: DEFAULT_LIMIT, offset: 0, signal })
  });

export const useCreateProjectMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateProjectPayload) => createProject(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.list() });
    }
  });
};

export const useUpdateProjectMutation = (projectId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProjectPayload) => {
      if (!projectId) {
        throw new Error('projectId is required to update a project');
      }
      return updateProject(projectId, payload);
    },
    onSuccess: () => {
      if (!projectId) {
        return;
      }
      queryClient.invalidateQueries({ queryKey: projectsKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.list() });
    }
  });
};

export const useCreateItemMutation = (projectId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateItemPayload) => {
      if (!projectId) {
        throw new Error('projectId is required to create an item');
      }
      return createItem(projectId, payload);
    },
    onSuccess: () => {
      if (!projectId) {
        return;
      }
      queryClient.invalidateQueries({ queryKey: projectsKeys.items(projectId) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.detail(projectId) });
    }
  });
};
