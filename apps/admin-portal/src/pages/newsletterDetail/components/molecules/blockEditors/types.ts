import type { CampaignBlock } from '../../../schema';

/**
 * The contract every block editor shares.
 *
 * `onChange` takes a PARTIAL patch rather than the whole block: each editor
 * then only names the fields it owns, and none of them can accidentally drop
 * the block's `id` or `type` by spreading an incomplete object back.
 */
export type BlockEditorProps<B extends CampaignBlock> = {
  block: B;
  disabled?: boolean;
  onChange: (patch: Partial<CampaignBlock>) => void;
};
