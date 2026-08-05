import { Card, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@sinnapi/ui';
import { formatMoney, formatDate } from '@/lib/config';
import type { DiscountModel } from '@/lib/types';

/** The vendor's discount codes, their value, usage and window. */
export default function DiscountsTable({ rows }: { rows: DiscountModel[] }) {
  return (
    <Card variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Code</TableCell>
            <TableCell>Value</TableCell>
            <TableCell>Uses</TableCell>
            <TableCell>Window</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((d) => (
            <TableRow key={d.id} hover>
              <TableCell>{d.code ?? '—'}</TableCell>
              <TableCell>
                {d.type === 'percentage' ? `${d.value}%` : formatMoney(d.value, d.currency)}
              </TableCell>
              <TableCell>
                {d.used_count}
                {d.max_uses ? ` / ${d.max_uses}` : ''}
              </TableCell>
              <TableCell>
                {formatDate(d.starts_at)} – {formatDate(d.ends_at)}
              </TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={d.is_active ? 'Active' : 'Inactive'}
                  color={d.is_active ? 'success' : 'default'}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
