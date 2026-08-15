import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useNewsletterCampaign as useCampaignQuery, useNewsletterStats } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';
import { invokeFunction } from '@/lib/functions';
import { EDITABLE_STATUSES } from '@/pages/newsletters/schema';
import { useCampaignBlocks } from './useCampaignBlocks';
import { useCampaignAudience } from './useCampaignAudience';
import {
  blockIssue,
  parseBlocks,
  isComposerStep,
  type ComposerStep,
  type CampaignBlock,
} from '../schema';
import type { NewsletterQueueResult } from '@/lib/types';

/** RPC error codes mapped to copy an operator can act on. */
const RPC_MESSAGES: Record<string, string> = {
  forbidden: 'You do not have permission to send newsletters.',
  campaign_not_found: 'This campaign no longer exists.',
  campaign_not_editable:
    'This campaign has already been scheduled or sent, so its audience is fixed.',
  campaign_not_cancellable: 'This campaign is already sending and can no longer be cancelled.',
  no_recipients: 'Select at least one recipient before scheduling.',
  attestation_required:
    'Confirm that you hold consent for the addresses you entered before sending.',
};

function friendly(message: string | null | undefined): string | null {
  if (!message) return null;
  const key = Object.keys(RPC_MESSAGES).find((k) => message.includes(k));
  return key ? RPC_MESSAGES[key] : message;
}

/**
 * The composer's coordinator: loads a campaign, owns its unsaved edits, and
 * owns the three transitions that put it in front of customers.
 *
 * ── Why saving is explicit rather than continuous ─────────────────────────
 * There is no autosave. A newsletter is written over a sitting or two and then
 * sent to thousands of people at once; a draft that saves on every keystroke
 * turns a half-finished sentence into the persisted truth, and the preview and
 * test-send paths both read from the SERVER copy (so they render through the
 * real Edge Function renderer rather than an approximation). Making the save a
 * deliberate act keeps "what I am looking at" and "what would go out" the same
 * question — and `save()` is called for the operator right before preview and
 * test, so the explicitness never costs them a step.
 */
export function useNewsletterCampaign() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();

  const { data: campaign, isLoading, error } = useCampaignQuery(id);

  // ── Step navigation, mirrored into the URL so a refresh stays put ────────
  const stepParam = params.get('step');
  const step: ComposerStep = isComposerStep(stepParam) ? stepParam : 'compose';
  const setStep = useCallback(
    (next: ComposerStep) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set('step', next);
          return p;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  // ── Details form ─────────────────────────────────────────────────────────
  const [details, setDetails] = useState({ title: '', subject: '', preheader: '' });
  const [detailsDirty, setDetailsDirty] = useState(false);
  const blocksApi = useCampaignBlocks([]);
  const { reset: resetBlocks } = blocksApi;

  // Seed local state once the server copy arrives. Keyed on the campaign id and
  // its `updated_at` so a refetch after a save re-seeds, but a refetch while
  // somebody is mid-sentence does not overwrite what they are typing.
  const seedKey = campaign ? `${campaign.id}` : null;
  useEffect(() => {
    if (!campaign) return;
    setDetails({
      title: campaign.title,
      subject: campaign.subject,
      preheader: campaign.preheader ?? '',
    });
    setDetailsDirty(false);
    resetBlocks(parseBlocks(campaign.blocks));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);

  const setDetail = useCallback((key: keyof typeof details, value: string) => {
    setDetails((prev) => ({ ...prev, [key]: value }));
    setDetailsDirty(true);
  }, []);

  const audience = useCampaignAudience(campaign?.audience ?? 'clients');

  const editable = Boolean(campaign && EDITABLE_STATUSES.includes(campaign.status));
  const dirty = detailsDirty || blocksApi.dirty;

  // ── Validation ───────────────────────────────────────────────────────────
  const issues = useMemo(() => {
    const found: string[] = [];
    if (!details.subject.trim()) found.push('Add a subject line');
    if (blocksApi.blocks.length === 0) found.push('Add at least one content block');
    for (const block of blocksApi.blocks) {
      const issue = blockIssue(block);
      if (issue) found.push(issue);
    }
    return found;
  }, [details.subject, blocksApi.blocks]);

  // ── Writes ───────────────────────────────────────────────────────────────
  const [busy, setBusy] = useState<null | 'save' | 'preview' | 'test' | 'queue' | 'cancel'>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const save = useCallback(async (): Promise<boolean> => {
    if (!id) return false;
    setBusy('save');
    setActionError(null);
    const { error: e } = await supabase
      .from('newsletter_campaigns')
      .update({
        title: details.title.trim(),
        subject: details.subject.trim(),
        preheader: details.preheader.trim() || null,
        // The editor-local `id` rides along with each block; the renderer
        // ignores it, and keeping it means a reload does not renumber the list.
        blocks: blocksApi.blocks as unknown as CampaignBlock[],
      })
      .eq('id', id);
    setBusy(null);
    if (e) {
      setActionError(friendly(e.message));
      return false;
    }
    setDetailsDirty(false);
    blocksApi.markClean();
    qc.invalidateQueries({ queryKey: ['newsletter-campaign', id] });
    qc.invalidateQueries({ queryKey: ['newsletter-campaigns'] });
    return true;
  }, [id, details, blocksApi, qc]);

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  /** Save first, then render through the same code path the send uses. */
  const preview = useCallback(async () => {
    if (!id) return;
    if (dirty && !(await save())) return;
    setBusy('preview');
    setActionError(null);
    const { data, error: e } = await invokeFunction<{ html: string }>('newsletter-dispatch', {
      action: 'preview',
      campaignId: id,
    });
    setBusy(null);
    if (e || !data?.html) {
      setActionError(friendly(e) ?? 'Preview failed.');
      return;
    }
    setPreviewHtml(data.html);
  }, [id, dirty, save]);

  const sendTest = useCallback(
    async (email: string) => {
      if (!id) return;
      if (dirty && !(await save())) return;
      setBusy('test');
      setActionError(null);
      setNotice(null);
      const { error: e } = await invokeFunction('newsletter-dispatch', {
        action: 'test',
        campaignId: id,
        email,
      });
      setBusy(null);
      if (e) {
        setActionError(friendly(e));
        return;
      }
      setNotice(`Test sent to ${email}.`);
    },
    [id, dirty, save],
  );

  const [queueResult, setQueueResult] = useState<NewsletterQueueResult | null>(null);

  /**
   * Freeze the audience onto the campaign.
   *
   * Separate from scheduling on purpose: this is the step whose result the
   * operator has to read before committing ("412 queued, 38 excluded"), and
   * folding it into the send button would mean those numbers appear only after
   * the mail is already going out.
   */
  const queueRecipients = useCallback(async (): Promise<boolean> => {
    if (!id) return false;
    setBusy('queue');
    setActionError(null);
    const { data, error: e } = await supabase.rpc('admin_newsletter_queue', {
      p_campaign_id: id,
      ...audience.queueArgs,
    });
    setBusy(null);
    if (e) {
      setActionError(friendly(e.message));
      return false;
    }
    setQueueResult(((data ?? [])[0] ?? null) as NewsletterQueueResult | null);
    qc.invalidateQueries({ queryKey: ['newsletter-campaign', id] });
    return true;
  }, [id, audience.queueArgs, qc]);

  /** `when === null` means now. Both paths go through the same RPC. */
  const schedule = useCallback(
    async (when: Date | null) => {
      if (!id) return;
      setBusy('queue');
      setActionError(null);
      const { error: e } = await supabase.rpc('admin_newsletter_schedule', {
        p_campaign_id: id,
        p_scheduled_at: when ? when.toISOString() : null,
      });
      setBusy(null);
      if (e) {
        setActionError(friendly(e.message));
        return;
      }
      qc.invalidateQueries({ queryKey: ['newsletter-campaign', id] });
      qc.invalidateQueries({ queryKey: ['newsletter-campaigns'] });
      qc.invalidateQueries({ queryKey: ['newsletter-campaign-counts'] });
      setNotice(when ? 'Campaign scheduled.' : 'Campaign is sending now.');
    },
    [id, qc],
  );

  const cancel = useCallback(async () => {
    if (!id) return;
    setBusy('cancel');
    setActionError(null);
    const { error: e } = await supabase.rpc('admin_newsletter_cancel', { p_campaign_id: id });
    setBusy(null);
    if (e) {
      setActionError(friendly(e.message));
      return;
    }
    qc.invalidateQueries({ queryKey: ['newsletter-campaign', id] });
    qc.invalidateQueries({ queryKey: ['newsletter-campaigns'] });
    setNotice('Campaign returned to draft.');
  }, [id, qc]);

  // Stats only exist once something has been sent, so the query stays idle for
  // a draft rather than polling an endpoint that can only answer zero.
  const statsEnabled = Boolean(campaign && ['sending', 'sent', 'failed'].includes(campaign.status));
  const { data: stats } = useNewsletterStats(id, statsEnabled);

  return {
    campaign,
    isLoading,
    loadError: error instanceof Error ? error.message : null,
    editable,
    step,
    setStep,

    details,
    setDetail,
    blocks: blocksApi,
    audience,

    dirty,
    issues,
    canSend: issues.length === 0,

    busy,
    actionError,
    notice,
    dismissNotice: () => setNotice(null),

    save,
    preview,
    previewHtml,
    closePreview: () => setPreviewHtml(null),
    sendTest,
    queueRecipients,
    queueResult,
    clearQueueResult: () => setQueueResult(null),
    schedule,
    cancel,

    stats,
    statsEnabled,
    back: () => navigate('/newsletters'),
  };
}
