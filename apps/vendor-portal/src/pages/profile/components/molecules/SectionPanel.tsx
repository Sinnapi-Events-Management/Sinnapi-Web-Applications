import type { ReactNode } from 'react';
import { SectionCard } from '@sinnapi/ui';
import type { SectionMeta } from '../../schema/sectionMeta';

type Props = {
  meta: SectionMeta;
  action?: ReactNode;
  children: ReactNode;
};

/** A section's card, titled from its menu metadata so the two can't disagree. */
export default function SectionPanel({ meta, action, children }: Props) {
  return (
    <SectionCard
      title={meta.title}
      subtitle={meta.subtitle}
      icon={meta.icon}
      accent={meta.accent}
      action={action}
    >
      {children}
    </SectionCard>
  );
}
