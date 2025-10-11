import { apiFetch } from './http-client';

export type HealthResponse = {
  status: string;
  service: string;
};

export function getHealth() {
  return apiFetch<HealthResponse>('/health');
}
