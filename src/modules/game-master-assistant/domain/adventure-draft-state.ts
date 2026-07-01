export const ADVENTURE_DRAFT_STATE = "drafting";

export type AdventureDraftState = typeof ADVENTURE_DRAFT_STATE;

export function isAdventureDraftState(value: string): value is AdventureDraftState {
  return value === ADVENTURE_DRAFT_STATE;
}
