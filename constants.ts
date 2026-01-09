import { Discipline } from './types';

export const INITIAL_ELO = 1500;
export const K_FACTOR = 32;

export const DISCIPLINES: { id: Discipline, name: string }[] = [
  { id: 'ALL', name: 'All' },
  { id: 'MX', name: 'Motocross' },
  { id: 'SX', name: 'Supercross' }
];