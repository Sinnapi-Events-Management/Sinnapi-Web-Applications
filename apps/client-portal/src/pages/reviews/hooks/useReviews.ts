import { useReviews as useReviewsQuery } from '@/hooks/queries';

export function useReviews() {
  const { data, isLoading, error } = useReviewsQuery();
  const rows = data ?? [];

  return { rows, isLoading, error };
}
