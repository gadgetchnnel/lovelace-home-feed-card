import { computeDomain } from "./compute-domain.js";

export function computeStateDomain(stateObj) {
  return computeDomain(stateObj.entity_id);
}