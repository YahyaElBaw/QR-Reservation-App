/** 1 TND = 1000 millimes. DB stores integer millimes, API exposes TND with 3 decimals. */
export const toMillimes = (tnd: number): number => Math.round(tnd * 1000);
export const toTnd = (millimes: number): number => Number((millimes / 1000).toFixed(3));
