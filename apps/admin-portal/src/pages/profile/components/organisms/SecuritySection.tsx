import { Grid } from '@sinnapi/ui';
import { usePasswordChange } from '../../hooks/usePasswordChange';
import PasswordChangeForm from './PasswordChangeForm';
import SecurityTipsCard from '../molecules/SecurityTipsCard';

type Props = {
  onDone: (message: string) => void;
};

/**
 * The Security section: the password form, with the guidance that would
 * otherwise bloat it parked in a side card. The card drops below the form on
 * narrow screens so the fields stay first.
 */
export default function SecuritySection({ onDone }: Props) {
  const { busy, err, submit } = usePasswordChange(onDone);

  return (
    <Grid container spacing={3} alignItems="flex-start">
      <Grid item xs={12} md={7}>
        <PasswordChangeForm busy={busy} err={err} onSubmit={submit} />
      </Grid>
      <Grid item xs={12} md={5}>
        <SecurityTipsCard />
      </Grid>
    </Grid>
  );
}
