import {
  Card,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  Chip,
} from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import StatusChip from '@/components/ui/StatusChip';
import QueryState from '@/components/ui/QueryState';
import { formatDate } from '@/lib/config';
import { one } from '@/lib/rel';
import type { ProfileRef } from '@/lib/types';
import { useApplications } from './hooks/useApplications';

export default function Applications() {
  const { navigate, rows, isLoading, error } = useApplications();
  return (
    <>
      <PageTitle
        title="Vendor applications"
        subtitle="Review, run due diligence, and approve or reject."
      />
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState
            title="No applications"
            description="New vendor applications will appear here."
          />
        ) : (
          <Card variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Business</TableCell>
                  <TableCell>Applicant</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((a) => (
                  <TableRow
                    key={a.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/applications/${a.id}`)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {a.business_name}
                      </Typography>
                      {a.is_reapplication && (
                        <Chip size="small" label="Re-application" sx={{ mt: 0.5 }} />
                      )}
                    </TableCell>
                    <TableCell>{one<ProfileRef>(a.profiles)?.full_name ?? '—'}</TableCell>
                    <TableCell>{formatDate(a.submitted_at ?? a.created_at)}</TableCell>
                    <TableCell>
                      <StatusChip status={a.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </QueryState>
    </>
  );
}
