import QueryState from '@/components/ui/QueryState';
import EmptyState from '@/components/ui/EmptyState';
import { usePlanDetail } from './hooks/usePlanDetail';
import PlanHero from './components/PlanHero';
import PlanStats from './components/PlanStats';
import PlanTabs from './components/PlanTabs';
import PlanDrawer from '../pricingPlans/components/organisms/PlanDrawer';
import PlanDeleteDialog from '../pricingPlans/components/organisms/PlanDeleteDialog';

export default function PlanDetail() {
  const { plan, kpis, isLoading, error, edit, remove } = usePlanDetail();

  return (
    <QueryState isLoading={isLoading} error={error}>
      {!plan ? (
        <EmptyState title="Plan not found" ctaLabel="Back to plans" ctaHref="/pricing-plans" />
      ) : (
        <>
          <PlanHero
            plan={plan}
            onEdit={() => edit.openEdit(plan)}
            onDelete={() => remove.request(plan)}
          />
          <PlanStats kpis={kpis} trialDays={plan.trial_days} />

          <PlanTabs plan={plan} />

          <PlanDrawer
            open={edit.isOpen}
            mode={edit.mode}
            plan={edit.plan}
            busy={edit.busy}
            err={edit.err}
            onClose={edit.close}
            onSave={edit.save}
          />

          <PlanDeleteDialog
            pending={remove.pending}
            busy={remove.busy}
            err={remove.err}
            onCancel={remove.cancel}
            onConfirm={remove.confirm}
          />
        </>
      )}
    </QueryState>
  );
}
