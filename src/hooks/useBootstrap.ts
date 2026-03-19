import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useBootstrap() {
  return useQuery({
    queryKey: ['bootstrap'],
    queryFn: api.bootstrap,
  });
}
