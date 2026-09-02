import type { Mode } from './mode';
import type { Stage } from './stage';
import type { Cosmetic } from './cosmetic';

export interface ContentBundle {
  contentVersion: number;   // Incremented on every breaking schema change
  schemaVersion: number;    // Incremented on every save-data schema change
  modes: Mode[];
  stages: Stage[];
  cosmetics: Cosmetic[];
}
