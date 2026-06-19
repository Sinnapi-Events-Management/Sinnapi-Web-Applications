import { Link as RouterLink } from 'react-router-dom';
import { Card, List, ListItemButton, ListItemText, Divider } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import QueryState from '@/components/ui/QueryState';
import { useConversations } from '@/hooks/queries';
import { formatDate, titleize } from '@/lib/config';
import { one } from '@/lib/rel';
import type { VendorNameRefModel } from '@/lib/types';

export default function Messages() {
  const { data, isLoading, error } = useConversations();
  const rows = data ?? [];

  return (
    <>
      <PageTitle title="Messages" subtitle="Chat with vendors and the Sinnapi team." />
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState
            title="No conversations yet"
            description="Message a vendor from their profile to start a conversation."
            ctaLabel="Discover vendors"
            ctaHref="/discover"
          />
        ) : (
          <Card variant="outlined">
            <List disablePadding>
              {rows.map((c, i) => (
                <div key={c.id}>
                  {i > 0 && <Divider />}
                  <ListItemButton component={RouterLink} to={`/messages/${c.id}`}>
                    <ListItemText
                      primary={
                        one<VendorNameRefModel>(c.vendors)?.business_name ??
                        c.subject ??
                        titleize(c.type)
                      }
                      secondary={
                        c.last_message_at
                          ? `Last activity ${formatDate(c.last_message_at)}`
                          : 'No messages yet'
                      }
                    />
                  </ListItemButton>
                </div>
              ))}
            </List>
          </Card>
        )}
      </QueryState>
    </>
  );
}
