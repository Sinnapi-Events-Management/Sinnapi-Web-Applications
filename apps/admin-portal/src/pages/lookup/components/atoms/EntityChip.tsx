import { Chip } from '@sinnapi/ui';
import { publicIdCategory } from '@sinnapi/utils/publicId';

type Props = {
  /** The identifier itself — the category is read from its prefix. */
  publicId: string;
};

/**
 * What kind of record an identifier names, as a chip.
 *
 * Derived from the prefix rather than from the RPC's `entity` field, and
 * deliberately so: the prefix is the part the agent is looking at, so naming it
 * from the same source is what lets them learn the map. `publicIdCategory`
 * degrades to `'Record'` for a prefix this build has not heard of, so a portal
 * one deploy behind the database still renders.
 *
 * `variant="outlined"` because the chip labels the result rather than ranking
 * it — a filled chip beside a heading reads as a status, which this is not.
 */
export default function EntityChip({ publicId }: Props) {
  return <Chip size="small" variant="outlined" label={publicIdCategory(publicId)} />;
}
