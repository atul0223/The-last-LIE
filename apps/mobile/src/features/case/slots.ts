import type { ComponentType } from 'react';

export interface CaseSlotProps {
  sessionId: string;
}

export type CaseSlotComponent = ComponentType<CaseSlotProps>;
