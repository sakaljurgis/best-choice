import type { Request, Response } from 'express';
import {
  createProject as createProjectRepo,
  deleteProject as deleteProjectRepo,
  getProjectById,
  listProjects as listProjectsRepo,
  updateProject as updateProjectRepo
} from '../db/projects-repository.js';
import { HttpError } from '../errors/http-error.js';
import { parsePaginationParams, parseUuid } from '../validation/common.js';
import {
  parseProjectCreatePayload,
  parseProjectStatusFilter,
  parseProjectUpdatePayload
} from '../validation/projects.js';

export const listProjects = async (req: Request, res: Response) => {
  const pagination = parsePaginationParams(req.query as Record<string, unknown>);
  const status = parseProjectStatusFilter((req.query as Record<string, unknown>).status);

  const projects = await listProjectsRepo({
    limit: pagination.limit,
    offset: pagination.offset,
    status
  });

  res.json({
    data: projects,
    meta: {
      limit: pagination.limit,
      offset: pagination.offset,
      count: projects.length
    }
  });
};

export const createProject = async (req: Request, res: Response) => {
  const payload = parseProjectCreatePayload(req.body);
  const project = await createProjectRepo({
    name: payload.name,
    description: payload.description,
    status: payload.status,
    attributes: payload.projectAttributes,
    priorityRules: payload.projectPriorityRules
  });

  res.status(201).json({ data: project });
};

export const getProject = async (req: Request, res: Response) => {
  const projectId = parseUuid(req.params.projectId, 'projectId');
  const project = await getProjectById(projectId);

  if (!project) {
    throw new HttpError(404, 'Project not found');
  }

  res.json({ data: project });
};

export const updateProject = async (req: Request, res: Response) => {
  const projectId = parseUuid(req.params.projectId, 'projectId');
  const payload = parseProjectUpdatePayload(req.body);

  const project = await updateProjectRepo(projectId, {
    name: payload.name,
    description: payload.description,
    status: payload.status,
    attributes: payload.projectAttributes,
    priorityRules: payload.projectPriorityRules
  });

  if (!project) {
    throw new HttpError(404, 'Project not found');
  }

  res.json({ data: project });
};

export const deleteProject = async (req: Request, res: Response) => {
  const projectId = parseUuid(req.params.projectId, 'projectId');
  const deleted = await deleteProjectRepo(projectId);

  if (!deleted) {
    throw new HttpError(404, 'Project not found');
  }

  res.status(204).send();
};
