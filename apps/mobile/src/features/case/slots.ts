import type { ComponentType } from 'react';
import type { UseCaseSessionReturn, CaseSessionStatus } from '../../store';

export interface CaseSlotProps {
  sessionId: string;
}

export type CaseSlotComponent = ComponentType<CaseSlotProps>;

export { useCaseSession, useGameService } from '../../store';
export type { UseCaseSessionReturn, CaseSessionStatus };
