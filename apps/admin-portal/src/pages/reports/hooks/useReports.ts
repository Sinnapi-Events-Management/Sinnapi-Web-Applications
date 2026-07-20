import { useState } from 'react';
import {
  DEFAULT_CATEGORY,
  DEFAULT_PERIOD,
  type ReportCategory,
  type ReportPeriod,
} from '../schema';

/**
 * Page-level view state for Reports: the active category tab and the reporting
 * period. Both live here (not per panel) so switching category preserves the
 * chosen window, and the individual report data hooks stay purely about data.
 */
export function useReports() {
  const [category, setCategory] = useState<ReportCategory>(DEFAULT_CATEGORY);
  const [period, setPeriod] = useState<ReportPeriod>(DEFAULT_PERIOD);

  return { category, setCategory, period, setPeriod };
}
