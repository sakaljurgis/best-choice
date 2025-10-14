import type { ProjectStatus } from '@shared/models/project';
import { HttpError } from '../errors/http-error.js';

const projectStatuses = new Set<ProjectStatus>(['active', 'archived']);

const isProjectStatus = (value: unknown): value is ProjectStatus => {
  return typeof value === 'string' && projectStatuses.has(value as ProjectStatus);
};

const isStringArray = (value: unknown): value is string[] => {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'string' && item.trim().length > 0)
  );
};

export interface ProjectCreateInput {
  name: string;
  description: string | null;
  status: ProjectStatus;
  projectAttributes: string[];
  projectPriorityRules: unknown;
}

export type ProjectUpdateInput = Partial<ProjectCreateInput>;

export const parseProjectCreatePayload = (payload: unknown): ProjectCreateInput => {
  if (payload === null || typeof payload !== 'object') {
    throw new HttpError(400, 'Body must be an object');
  }

  const {
    name,
    description = null,
    status = 'active',
    attributes,
    priorityRules
  } = payload as Record<string, unknown>;

  if (typeof name !== 'string' || name.trim().length === 0 || name.length > 150) {
    throw new HttpError(400, 'name must be a non-empty string up to 150 characters');
  }

  if (description !== null && typeof description !== 'string') {
    throw new HttpError(400, 'description must be a string or null');
  }

  if (!isProjectStatus(status)) {
    throw new HttpError(400, 'status must be one of active, archived');
  }

  const projectAttributes = attributes ?? [];
  if (!isStringArray(projectAttributes)) {
    throw new HttpError(400, 'attributes must be an array of non-empty strings');
  }

  return {
    name: name.trim(),
    description: description === null ? null : description,
    status: status as ProjectStatus,
    projectAttributes,
    projectPriorityRules: priorityRules ?? []
  };
};

export const parseProjectUpdatePayload = (
  payload: unknown
): ProjectUpdateInput => {
  if (payload === null || typeof payload !== 'object') {
    throw new HttpError(400, 'Body must be an object');
  }

  const result: ProjectUpdateInput = {};
  const { name, description, status, attributes, priorityRules } =
    payload as Record<string, unknown>;

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 150) {
      throw new HttpError(400, 'name must be a non-empty string up to 150 characters');
    }
    result.name = name.trim();
  }

  if (description !== undefined) {
    if (description !== null && typeof description !== 'string') {
      throw new HttpError(400, 'description must be a string or null');
    }
    result.description = description === null ? null : (description as string);
  }

  if (status !== undefined) {
    if (!isProjectStatus(status)) {
      throw new HttpError(400, 'status must be one of active, archived');
    }
    result.status = status;
  }

  if (attributes !== undefined) {
    if (!isStringArray(attributes)) {
      throw new HttpError(400, 'attributes must be an array of non-empty strings');
    }
    result.projectAttributes = attributes;
  }

  if (priorityRules !== undefined) {
    result.projectPriorityRules = priorityRules;
  }

  if (Object.keys(result).length === 0) {
    throw new HttpError(400, 'At least one field must be provided for update');
  }

  return result;
};

export const parseProjectStatusFilter = (value: unknown): ProjectStatus | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (!isProjectStatus(value)) {
    throw new HttpError(400, 'status filter must be one of active, archived');
  }
  return value;
};
