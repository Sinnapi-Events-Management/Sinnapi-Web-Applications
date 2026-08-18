import type { SvgIconComponent } from '@mui/icons-material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import PersonIcon from '@mui/icons-material/Person';
import ForumIcon from '@mui/icons-material/Forum';
import { titleizeToken } from './format';
import type { ConversationType } from './types';

/**
 * Display metadata for `conversation_type`, promoted here from the admin
 * portal's inbox schema.
 *
 * The label is audience-dependent, which is the whole reason this takes a
 * perspective rather than being a flat map. A `client_admin` thread is
 * "Support" to the client who opened it and "Client" to the operator working
 * the queue — the same row, named for whoever is reading it. Getting that wrong
 * is how an inbox ends up labelling every one of your own threads with your own
 * name.
 */
export type MessagingAudience = 'client' | 'vendor' | 'admin';

export type ConversationTypeMeta = {
  label: string;
  /** MUI palette colour for the type chip and the avatar tint. */
  color: 'primary' | 'secondary' | 'info' | 'default';
  /** Rendered by the caller, so this module stays free of JSX. */
  Icon: SvgIconComponent;
};

const SUPPORT: Omit<ConversationTypeMeta, 'label'> = { color: 'info', Icon: SupportAgentIcon };
const VENDOR: Omit<ConversationTypeMeta, 'label'> = { color: 'secondary', Icon: StorefrontIcon };
const PERSON: Omit<ConversationTypeMeta, 'label'> = { color: 'default', Icon: PersonIcon };

const META: Record<ConversationType, Record<MessagingAudience, ConversationTypeMeta>> = {
  client_vendor: {
    // To a client the counterparty is the business; to a vendor it is the
    // customer; to a moderator it is the pairing itself.
    client: { ...VENDOR, label: 'Vendor' },
    vendor: { ...PERSON, label: 'Client' },
    admin: { ...PERSON, label: 'Client ↔ vendor' },
  },
  vendor_admin: {
    client: { ...SUPPORT, label: 'Support' },
    vendor: { ...SUPPORT, label: 'Sinnapi support' },
    admin: { ...VENDOR, label: 'Vendor' },
  },
  client_admin: {
    client: { ...SUPPORT, label: 'Sinnapi support' },
    vendor: { ...SUPPORT, label: 'Support' },
    admin: { ...SUPPORT, label: 'Client support' },
  },
};

const FALLBACK: ConversationTypeMeta = { label: 'Conversation', color: 'default', Icon: ForumIcon };

/**
 * Maps a conversation type to its display metadata for a given viewer. An
 * unknown value — a future enum member reaching a portal that has not shipped
 * yet — degrades to a titleized label rather than rendering nothing.
 */
export function conversationTypeMeta(
  type: string,
  audience: MessagingAudience,
): ConversationTypeMeta {
  return META[type as ConversationType]?.[audience] ?? { ...FALLBACK, label: titleizeToken(type) };
}

export const CONVERSATION_TYPES: ConversationType[] = [
  'client_vendor',
  'vendor_admin',
  'client_admin',
];

/** Type-filter options for an inbox toolbar, labelled for the given viewer. */
export function conversationTypeFilters(audience: MessagingAudience) {
  return CONVERSATION_TYPES.map((value) => ({
    value,
    label: conversationTypeMeta(value, audience).label,
  }));
}
