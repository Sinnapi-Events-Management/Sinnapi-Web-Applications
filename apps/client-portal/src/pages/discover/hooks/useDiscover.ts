import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useVendors } from '@/hooks/queries';

export function useDiscover() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const vendors = useVendors(params.get('q') ?? undefined);

  function search(e: React.FormEvent) {
    e.preventDefault();
    setParams(q ? { q } : {});
  }

  return { q, setQ, search, vendors };
}
