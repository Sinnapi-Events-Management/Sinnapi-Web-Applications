import { useNavigate, useParams } from 'react-router-dom';
import { usePlan, usePlanKpis } from '@/hooks/queries';
import { usePlanEdit } from '../../pricingPlans/hooks/usePlanEdit';
import { usePlanDelete } from '../../pricingPlans/hooks/usePlanDelete';

/**
 * Detail view for a single plan: the record, its subscriber KPIs, and the
 * create/edit/delete flows reused from the list feature. Deleting navigates
 * back to the catalogue; editing invalidates the plan query so the page
 * repaints with the saved values.
 */
export function usePlanDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: plan, isLoading, error } = usePlan(id);
  const { data: kpis } = usePlanKpis(id);
  const edit = usePlanEdit();
  const remove = usePlanDelete(() => navigate('/pricing-plans'));

  return { id, plan, kpis, isLoading, error, edit, remove, navigate };
}
