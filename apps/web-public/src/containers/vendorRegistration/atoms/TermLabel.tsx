import NextLink from 'next/link';
import { Link, Typography } from '@sinnapi/ui/atoms';

type Props = { label: string; href?: string };

/**
 * A terms sentence, linking to the full policy when there is one. The link opens
 * a new tab so reading the policy doesn't discard a half-filled form.
 */
export default function TermLabel({ label, href }: Props) {
  if (!href) return <Typography variant="body2">{label}</Typography>;
  return (
    <Typography variant="body2">
      {label.replace(/\.$/, '')}{' '}
      <Link component={NextLink} href={href} target="_blank" rel="noopener">
        (read)
      </Link>
    </Typography>
  );
}
