import type { SvgIconComponent } from '@mui/icons-material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import PersonIcon from '@mui/icons-material/Person';
import ForumIcon from '@mui/icons-material/Forum';
import { titleize } from '@/lib/config';

/** The `conversation_type` enum — who the two participants are. */
export const CONVERSATION_TYPES = ['client_vendor', 'vendor_admin', 'client_admin'] as const;

export type ConversationType = (typeof CONVERSATION_TYPES)[number];

type ConversationTypeMeta = {
  label: string;
  /** MUI palette colour for the type chip and the row's avatar tint. */
  color: 'primary' | 'secondary' | 'info' | 'default';
  /** Icon component — the caller renders it, keeping this a plain .ts helper. */
  Icon: SvgIconComponent;
};

const META: Record<ConversationType, ConversationTypeMeta> = {
  // A vendor talking to this admin team — the inbox's primary workload.
  vendor_admin: { label: 'Vendor', color: 'secondary', Icon: StorefrontIcon },
  // A client talking to this admin team — support requests.
  client_admin: { label: 'Support', color: 'info', Icon: SupportAgentIcon },
  // Client↔vendor threads, visible to admins only for moderation.
  client_vendor: { label: 'Client ↔ vendor', color: 'default', Icon: PersonIcon },
};

const FALLBACK: ConversationTypeMeta = { label: 'Conversation', color: 'default', Icon: ForumIcon };

/**
 * Maps a conversation type to its display metadata. Unknown values (a future
 * enum member) degrade to a titleized label rather than rendering nothing.
 */
export function conversationTypeMeta(type: string): ConversationTypeMeta {
  return META[type as ConversationType] ?? { ...FALLBACK, label: titleize(type) };
}

/** Type filter options for the toolbar chips, in inbox-priority order. */
export const CONVERSATION_TYPE_FILTERS = CONVERSATION_TYPES.map((value) => ({
  value,
  label: conversationTypeMeta(value).label,
}));
