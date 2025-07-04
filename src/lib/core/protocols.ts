export const protocols = {
  aave: { name: 'Aave' },
  compound: { name: 'Compound' },
  // dolomite: { name: 'Dolomite' },
  // euler: { name: 'Euler' },
  morpho: { name: 'Morpho' },
  // spark: { name: 'Spark' },
  // zerolend: { name: 'Zerolend' },
} as const;

export type Protocol = keyof typeof protocols;
