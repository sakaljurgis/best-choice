import { useQuery } from '@tanstack/react-query';
import { getHealth, type HealthResponse } from '../api/health';

const healthQueryKeys = {
  all: ['health'] as const
};

export function useHealthQuery() {
  return useQuery<HealthResponse>({
    queryKey: healthQueryKeys.all,
    queryFn: getHealth,
    staleTime: 30_000
  });
}
