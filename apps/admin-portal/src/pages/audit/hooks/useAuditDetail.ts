import { useState } from 'react';
import type { AuditLogModel } from '@/lib/types';

export type AuditDetailApi = {
  selected: AuditLogModel | null;
  isOpen: boolean;
  open: (log: AuditLogModel) => void;
  close: () => void;
};

/** Tracks which audit entry is expanded in the detail drawer. */
export function useAuditDetail(): AuditDetailApi {
  const [selected, setSelected] = useState<AuditLogModel | null>(null);
  return {
    selected,
    isOpen: selected !== null,
    open: setSelected,
    close: () => setSelected(null),
  };
}
