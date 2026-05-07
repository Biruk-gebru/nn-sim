export type DatasetName = 'XOR' | 'AND' | 'OR';

export interface Sample {
  input: number[];
  target: number[];
}

export const DATASETS: Record<DatasetName, Sample[]> = {
  XOR: [
    { input: [0, 0], target: [0] },
    { input: [0, 1], target: [1] },
    { input: [1, 0], target: [1] },
    { input: [1, 1], target: [0] },
  ],
  AND: [
    { input: [0, 0], target: [0] },
    { input: [0, 1], target: [0] },
    { input: [1, 0], target: [0] },
    { input: [1, 1], target: [1] },
  ],
  OR: [
    { input: [0, 0], target: [0] },
    { input: [0, 1], target: [1] },
    { input: [1, 0], target: [1] },
    { input: [1, 1], target: [1] },
  ],
};
