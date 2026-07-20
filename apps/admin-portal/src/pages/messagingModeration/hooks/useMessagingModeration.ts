import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMessageFlags } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';
import { one } from '@/lib/rel';
import type { MessageRef } from '@/lib/types';
import { ACTIONABLE_STATUS, type FlagCounts, type FlagTab } from '../schema';

/**
 * Flattened, display-ready view of a message flag. Normalising the embedded
 * message relation here keeps the `one<MessageRef>()` plumbing out of the UI.
 */
export type FlagView = {
  id: string;
  reason: string;
  status: string;
  body: string | null;
  messageId: string | undefined;
  createdAt: string | null;
  /** Open flags are the only ones that can be blocked/dismissed or selected. */
  actionable: boolean;
};

const EMPTY_COUNTS: FlagCounts = { open: 0, actioned: 0, dismissed: 0, all: 0 };

function toView(f: {
  id: string;
  reason: string;
  status: string;
  created_at: string | null;
  messages: MessageRef | MessageRef[] | null;
}): FlagView {
  const msg = one<MessageRef>(f.messages);
  return {
    id: f.id,
    reason: f.reason,
    status: f.status,
    body: msg?.body ?? null,
    messageId: msg?.id,
    createdAt: f.created_at,
    actionable: f.status === ACTIONABLE_STATUS,
  };
}

export function useMessagingModeration() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useMessageFlags();

  const [tab, setTab] = useState<FlagTab>('open');
  const [searchInput, setSearchInput] = useState('');
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const all = useMemo(() => (data ?? []).map(toView), [data]);

  const counts: FlagCounts = useMemo(() => {
    if (!all.length) return EMPTY_COUNTS;
    return all.reduce<FlagCounts>(
      (acc, f) => {
        acc.all += 1;
        if (f.status === 'open') acc.open += 1;
        else if (f.status === 'actioned') acc.actioned += 1;
        else if (f.status === 'dismissed') acc.dismissed += 1;
        return acc;
      },
      { ...EMPTY_COUNTS },
    );
  }, [all]);

  const query = searchInput.trim().toLowerCase();

  const rows = useMemo(() => {
    let list = tab === 'all' ? all : all.filter((f) => f.status === tab);
    if (query) {
      list = list.filter(
        (f) => f.body?.toLowerCase().includes(query) || f.reason.toLowerCase().includes(query),
      );
    }
    return list;
  }, [all, tab, query]);

  // The pool a bulk action can touch: open flags in the current filtered view.
  const selectableIds = useMemo(() => rows.filter((f) => f.actionable).map((f) => f.id), [rows]);

  // Selection must never outlive the rows that are actually on screen — reset it
  // whenever the filter changes so a bulk action can't hit a hidden flag.
  useEffect(() => {
    setSelected(new Set());
  }, [tab, query]);

  const selectedInView = useMemo(
    () => selectableIds.filter((id) => selected.has(id)),
    [selectableIds, selected],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      // Toggling "all" is off when everything selectable is already picked.
      if (selectableIds.every((id) => prev.has(id))) return new Set();
      return new Set(selectableIds);
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function refresh() {
    qc.invalidateQueries({ queryKey: ['message-flags'] });
  }

  async function blockMessage(messageId: string | undefined, flagId: string) {
    setBusy(flagId);
    setErr(null);
    const r1 = await supabase
      .from('messages')
      .update({ moderation_status: 'blocked' })
      .eq('id', messageId);
    const r2 = await supabase.from('message_flags').update({ status: 'actioned' }).eq('id', flagId);
    setBusy(null);
    if (r1.error || r2.error) {
      setErr((r1.error ?? r2.error)!.message);
      return;
    }
    setNotice('Message blocked.');
    refresh();
  }

  async function dismiss(flagId: string) {
    setBusy(flagId);
    setErr(null);
    const { error: e } = await supabase
      .from('message_flags')
      .update({ status: 'dismissed' })
      .eq('id', flagId);
    setBusy(null);
    if (e) {
      setErr(e.message);
      return;
    }
    setNotice('Flag dismissed.');
    refresh();
  }

  async function blockSelected() {
    const picked = rows.filter((f) => f.actionable && selected.has(f.id));
    if (!picked.length) return;
    setBulkBusy(true);
    setErr(null);
    const messageIds = picked.map((f) => f.messageId).filter((id): id is string => !!id);
    const flagIds = picked.map((f) => f.id);
    const r1 = messageIds.length
      ? await supabase
          .from('messages')
          .update({ moderation_status: 'blocked' })
          .in('id', messageIds)
      : { error: null };
    const r2 = await supabase
      .from('message_flags')
      .update({ status: 'actioned' })
      .in('id', flagIds);
    setBulkBusy(false);
    if (r1.error || r2.error) {
      setErr((r1.error ?? r2.error)!.message);
      return;
    }
    clearSelection();
    setNotice(`Blocked ${flagIds.length} message${flagIds.length === 1 ? '' : 's'}.`);
    refresh();
  }

  async function dismissSelected() {
    const flagIds = rows.filter((f) => f.actionable && selected.has(f.id)).map((f) => f.id);
    if (!flagIds.length) return;
    setBulkBusy(true);
    setErr(null);
    const { error: e } = await supabase
      .from('message_flags')
      .update({ status: 'dismissed' })
      .in('id', flagIds);
    setBulkBusy(false);
    if (e) {
      setErr(e.message);
      return;
    }
    clearSelection();
    setNotice(`Dismissed ${flagIds.length} flag${flagIds.length === 1 ? '' : 's'}.`);
    refresh();
  }

  return {
    rows,
    counts,
    isLoading,
    error,
    busy,
    bulkBusy,
    err,
    notice,
    clearNotice: () => setNotice(null),
    tab,
    setTab,
    search: {
      input: searchInput,
      setInput: setSearchInput,
      clear: () => setSearchInput(''),
    },
    selection: {
      count: selectedInView.length,
      selectableCount: selectableIds.length,
      allSelected: selectableIds.length > 0 && selectedInView.length === selectableIds.length,
      someSelected: selectedInView.length > 0,
      isSelected: (id: string) => selected.has(id),
      toggle,
      toggleAll,
      clear: clearSelection,
    },
    blockMessage,
    dismiss,
    blockSelected,
    dismissSelected,
  };
}

export type Selection = ReturnType<typeof useMessagingModeration>['selection'];
