// Omniva International Parcels — Business Customer Price List
// Valid from 2025-07-01. Prices in EUR, ex-VAT.
// Source: https://www.omniva.ee/wp-content/uploads/sites/7/2025/08/hinnakiri-rv-pakiteenused-ari-est-en-2025.pdf

// Weight bracket upper bounds in kg. Each price array index corresponds to one bracket.
// e.g. index 0 = up to 0.25kg, index 3 = up to 2kg, etc.
export const WEIGHT_BRACKETS = [0.25, 0.5, 1, 2, 3, 5, 10, 15, 20, 25, 30] as const

export const ADDITIONAL_FEES = {
  customsServiceFee: { fixed: 3, percentOfDuty: 0.03 }, // €3 + 3% of customs duty
  insurance: 0.05, // 5% of shipment value
  manualDataEntry: 1.99,
  proofOfDelivery: 3.0,
  returnToParcelLocker: 8.0,
  returnByCourier: 10.0,
  courierPickup: 4.0,
  fuelSurchargePercent: 0.07, // ~7%, recalculated monthly
}

export const PRODUCTS = {
  device: { name: 'Asius v1', hsCode: '85176200', weightKg: 1.0, valueEur: 399 },
  commaFour: { name: 'Comma Four', hsCode: '85258100' },
  harness: { name: 'Car Harness', hsCode: '85444200' },
} as const

type Tier = {
  prices: (number | null)[] // length 11, index matches WEIGHT_BRACKETS. null = not available at that weight
  days: [number, number] // [min, max] estimated working days
}

export type Country = {
  name: string
  eu: boolean
  duty?: { device: number; commaFour: number; harness: number; deMinimis?: string }
  rates: {
    premium?: Tier
    standard?: Tier
    economy?: Tier
  }
}

// Duty rates: percentage of declared value. 0 = duty-free (ITA/FTA). null = unknown.
// EU countries have no import duty (single market).
// US $800 de minimis means single Asius v1 (~$430) enters duty-free.
export const COUNTRIES: Record<string, Country> = {
  // ===================== EU COUNTRIES =====================
  AT: {
    name: 'Austria',
    eu: true,
    rates: {
      premium: { prices: [13.09, 13.14, 13.24, 14.85, 15.06, 15.48, 17.23, 18.98, 20.73, 22.48, 24.23], days: [4, 5] },
      standard: { prices: [7.59, 9.23, 10.5, 12.37, 14.92, 17.97, 24.58, 31.2, 37.81, 44.43, 51.04], days: [4, 5] },
      economy: { prices: [5.91, 8.15, 10.44, 15.02, null, null, null, null, null, null, null], days: [4, 6] },
    },
  },
  BE: {
    name: 'Belgium',
    eu: true,
    rates: {
      premium: { prices: [12.61, 12.66, 12.77, 14.38, 14.59, 16.0, 17.75, 19.5, 21.25, 23.0, 24.75], days: [5, 9] },
      standard: { prices: [6.74, 8.09, 8.76, 9.64, 10.92, 13.14, 17.39, 22.09, 26.42, 32.99, 40.18], days: [5, 9] },
      economy: { prices: [6.23, 8.72, 11.5, 17.07, null, null, null, null, null, null, null], days: [8, 12] },
    },
  },
  BG: {
    name: 'Bulgaria',
    eu: true,
    rates: {
      premium: { prices: [13.99, 14.44, 15.34, 17.15, 18.96, 22.57, 32.3, 42.03, 51.76, 61.49, 71.22], days: [8, 13] },
      standard: { prices: [9.21, 10.99, 12.54, 14.96, 17.37, 21.53, 30.92, 40.3, 49.68, 59.06, 68.45], days: [9, 14] },
      economy: { prices: [4.08, 6.08, 7.9, 11.52, null, null, null, null, null, null, null], days: [9, 14] },
    },
  },
  HR: {
    name: 'Croatia',
    eu: true,
    rates: {
      premium: { prices: [13.37, 13.83, 14.73, 16.53, 18.97, 22.58, 32.31, 42.04, 51.77, 61.5, 71.23], days: [5, 9] },
      standard: { prices: [8.64, 10.43, 11.97, 14.39, 17.39, 21.55, 30.93, 40.31, 49.69, 59.08, 68.46], days: [6, 10] },
      economy: { prices: [7.37, 12.89, 21.72, 39.38, null, null, null, null, null, null, null], days: [6, 10] },
    },
  },
  CY: {
    name: 'Cyprus',
    eu: true,
    rates: {
      premium: { prices: [14.65, 15.11, 16.04, 17.91, 19.77, 23.49, 33.5, 43.51, 53.52, 63.53, 73.54], days: [6, 11] },
      standard: { prices: [9.83, 11.63, 13.2, 15.67, 18.14, 22.41, 32.06, 41.72, 51.37, 61.02, 70.67], days: [7, 12] },
      economy: { prices: [5.73, 9.6, 15.14, 26.23, null, null, null, null, null, null, null], days: [9, 14] },
    },
  },
  CZ: {
    name: 'Czech Republic',
    eu: true,
    rates: {
      premium: { prices: [10.85, 11.24, 12.0, 13.52, 15.79, 18.84, 27.17, 35.5, 43.83, 52.16, 60.49], days: [10, 14] },
      standard: { prices: [7.59, 9.31, 10.72, 12.87, 15.7, 19.32, 27.35, 35.38, 43.42, 51.45, 59.48], days: [11, 15] },
      economy: { prices: [5.37, 7.42, 9.3, 13.07, null, null, null, null, null, null, null], days: [11, 15] },
    },
  },
  DK: {
    name: 'Denmark',
    eu: true,
    rates: {
      premium: { prices: [11.83, 11.89, 12.0, 12.23, 12.98, 13.94, 27.96, 34.82, 41.68, null, null], days: [4, 7] },
      standard: { prices: [7.64, 8.99, 9.67, 10.54, 11.88, 12.96, 16.52, 18.21, 19.9, null, null], days: [4, 7] },
      economy: { prices: [4.8, 6.15, 6.63, 7.6, null, null, null, null, null, null, null], days: [7, 9] },
    },
  },
  FI: {
    name: 'Finland',
    eu: true,
    rates: {
      premium: { prices: [17.7, 17.79, 17.94, 18.24, 18.54, 19.14, 24.5, 26.75, 29.0, 31.25, 33.5], days: [2, 5] },
      standard: { prices: [6.29, 7.03, 7.84, 8.79, 9.06, 9.6, 11.64, 12.99, 14.34, 15.69, 17.04], days: [3, 6] },
      economy: { prices: [5.75, 7.71, 9.44, 12.89, null, null, null, null, null, null, null], days: [4, 8] },
    },
  },
  FR: {
    name: 'France',
    eu: true,
    rates: {
      premium: { prices: [17.32, 17.38, 17.49, 17.72, 17.94, 19.97, 22.7, 24.57, 26.45, 28.32, 30.2], days: [5, 9] },
      standard: { prices: [6.79, 8.14, 8.99, 10.18, 11.39, 13.15, 16.97, 21.11, 25.27, null, null], days: [7, 9] },
      economy: { prices: [4.68, 6.79, 8.8, 12.82, null, null, null, null, null, null, null], days: [8, 11] },
    },
  },
  DE: {
    name: 'Germany',
    eu: true,
    rates: {
      premium: { prices: [10.96, 11.02, 11.7, 11.93, 13.65, 14.27, 16.14, 18.59, 20.46, 22.89, 24.77], days: [5, 8] },
      standard: { prices: [6.44, 7.79, 8.64, 11.5, 13.65, 14.27, 16.14, 18.59, 20.46, 22.89, 24.77], days: [6, 9] },
      economy: { prices: [4.69, 6.84, 8.93, 13.11, null, null, null, null, null, null, null], days: [7, 11] },
    },
  },
  GR: {
    name: 'Greece',
    eu: true,
    rates: {
      premium: { prices: [15.19, 15.97, 17.54, 20.68, 26.14, 32.41, 48.79, 65.17, 81.55, 97.93, 114.31], days: [6, 12] },
      standard: { prices: [10.35, 12.46, 14.65, 18.35, 24.22, 30.94, 46.74, 62.53, 78.33, 94.12, 109.92], days: [7, 13] },
      economy: { prices: [6.02, 8.85, 12.31, 19.23, null, null, null, null, null, null, null], days: [9, 16] },
    },
  },
  HU: {
    name: 'Hungary',
    eu: true,
    rates: {
      premium: { prices: [12.38, 12.84, 13.77, 15.63, 17.49, 21.21, 31.26, 41.31, 51.36, 61.41, 62.45], days: [5, 10] },
      standard: { prices: [5.91, 7.26, 7.94, 10.29, 12.64, 16.66, 25.7, 34.75, 43.79, 52.84, null], days: [6, 11] },
      economy: { prices: [4.56, 6.61, 8.5, 12.3, null, null, null, null, null, null, null], days: [6, 11] },
    },
  },
  IE: {
    name: 'Ireland',
    eu: true,
    rates: {
      premium: { prices: [14.72, 15.52, 17.12, 20.33, 24.51, 30.93, 47.66, 64.39, 81.12, 97.85, 114.58], days: [6, 10] },
      standard: { prices: [9.91, 12.03, 14.26, 18.02, 22.71, 29.57, 45.7, 61.83, 77.96, 94.1, 110.23], days: [6, 10] },
      economy: { prices: [6.43, 9.08, 12.17, 18.37, null, null, null, null, null, null, null], days: [8, 11] },
    },
  },
  IT: {
    name: 'Italy',
    eu: true,
    rates: {
      premium: { prices: [11.26, 11.7, 13.31, 16.28, 17.32, 17.74, 20.79, 22.54, 24.29, 26.04, 27.79], days: [5, 7] },
      standard: { prices: [8.68, 10.03, 10.71, 11.58, 12.46, 13.54, 15.23, 16.92, 18.6, 20.29, 21.98], days: [5, 7] },
      economy: { prices: [5.55, 7.66, 9.68, 13.71, null, null, null, null, null, null, null], days: [7, 11] },
    },
  },
  LU: {
    name: 'Luxembourg',
    eu: true,
    rates: {
      premium: { prices: [12.36, 12.99, 14.24, 16.74, 19.85, 24.86, 38.09, 51.32, 64.55, 77.78, 91.01], days: [4, 8] },
      standard: { prices: [7.69, 10.32, 11.53, 14.62, 18.28, 23.79, 36.54, 49.3, 62.06, 74.82, 87.57], days: [5, 9] },
      economy: { prices: [6.08, 8.51, 11.16, 16.47, null, null, null, null, null, null, null], days: [7, 12] },
    },
  },
  MT: {
    name: 'Malta',
    eu: true,
    rates: {
      premium: { prices: [14.67, 15.32, 16.6, 19.18, 21.76, 26.91, 40.49, 54.07, 67.65, 81.23, 94.81], days: [5, 10] },
      standard: { prices: [9.86, 11.83, 13.74, 16.9, 20.06, 25.7, 38.8, 51.89, 64.99, 78.08, 91.18], days: [6, 11] },
      economy: { prices: [6.69, 11.24, 18.14, 31.94, null, null, null, null, null, null, null], days: [8, 13] },
    },
  },
  MC: {
    name: 'Monaco',
    eu: true,
    rates: {
      premium: { prices: [15.13, 15.44, 16.06, 17.29, 19.96, 22.43, 29.29, 36.15, 43.01, 49.87, 56.73], days: [6, 8] },
      standard: { prices: [10.54, 12.19, 13.46, 15.32, 18.58, 21.63, 28.24, 34.86, 41.47, 48.09, 54.7], days: [7, 9] },
      economy: { prices: [4.68, 6.79, 8.8, 12.82, null, null, null, null, null, null, null], days: [10, 12] },
    },
  },
  NL: {
    name: 'Netherlands',
    eu: true,
    rates: {
      premium: { prices: [13.11, 13.17, 13.27, 13.48, 13.69, 16.41, 25.8, 27.55, 29.3, 31.05, 32.8], days: [3, 4] },
      standard: { prices: [7.14, 8.49, 9.17, 10.04, 11.33, 13.42, 17.66, 22.79, 27.2, 34.36, 42.86], days: [3, 4] },
      economy: { prices: [4.83, 7.25, 9.88, 15.14, null, null, null, null, null, null, null], days: [5, 9] },
    },
  },
  PL: {
    name: 'Poland',
    eu: true,
    rates: {
      premium: { prices: [11.14, 11.2, 11.39, 11.63, 11.85, 12.23, 14.79, 17.07, 19.08, 27.32, 36.84], days: [5, 8] },
      standard: { prices: [6.18, 7.53, 8.21, 9.09, 9.96, 11.04, 12.73, 14.42, 16.11, null, null], days: [6, 8] },
      economy: { prices: [5.48, 7.52, 9.4, 13.17, null, null, null, null, null, null, null], days: [7, 9] },
    },
  },
  PT: {
    name: 'Portugal',
    eu: true,
    rates: {
      premium: { prices: [13.41, 14.2, 15.76, 18.9, 22.86, 29.13, 45.51, 61.89, 78.27, 94.65, 111.03], days: [7, 13] },
      standard: { prices: [8.69, 10.8, 12.99, 16.69, 21.15, 27.88, 43.67, 59.47, 75.26, 91.06, 106.85], days: [8, 14] },
      economy: { prices: [4.96, 7.44, 10.22, 15.76, null, null, null, null, null, null, null], days: [11, 17] },
    },
  },
  RO: {
    name: 'Romania',
    eu: true,
    rates: {
      premium: { prices: [13.81, 14.23, 15.06, 16.73, 18.4, 21.73, 30.76, 39.79, 48.82, 57.85, 66.88], days: [6, 12] },
      standard: { prices: [9.05, 10.8, 12.29, 14.57, 16.85, 20.74, 29.44, 38.15, 46.86, 55.57, 64.27], days: [7, 13] },
      economy: { prices: [6.05, 9.91, 15.45, 26.52, null, null, null, null, null, null, null], days: [10, 16] },
    },
  },
  SK: {
    name: 'Slovakia',
    eu: true,
    rates: {
      premium: { prices: [13.59, 14.11, 15.15, 17.22, 20.17, 24.32, 35.38, 46.44, 57.5, 68.56, 79.62], days: [5, 10] },
      standard: { prices: [8.84, 10.69, 12.37, 15.04, 18.54, 23.21, 33.87, 44.54, 55.2, 65.87, 76.53], days: [6, 11] },
      economy: { prices: [5.01, 7.11, 9.11, 13.11, null, null, null, null, null, null, null], days: [9, 14] },
    },
  },
  SI: {
    name: 'Slovenia',
    eu: true,
    rates: {
      premium: { prices: [13.42, 13.87, 14.77, 16.58, 18.59, 22.2, 31.93, 41.66, 51.39, 61.12, 70.85], days: [5, 9] },
      standard: { prices: [8.89, 10.67, 12.22, 14.63, 17.25, 21.41, 30.79, 40.18, 49.56, 58.94, 68.32], days: [6, 10] },
      economy: { prices: [6.09, 8.38, 10.76, 15.51, null, null, null, null, null, null, null], days: [9, 13] },
    },
  },
  ES: {
    name: 'Spain',
    eu: true,
    rates: {
      premium: { prices: [12.38, 12.85, 14.04, 16.4, 19.38, 25.07, 39.42, 58.01, 74.12, 64.47, 74.2], days: [6, 9] },
      standard: { prices: [7.53, 8.88, 9.56, 10.44, 11.69, 14.01, 18.79, 23.58, 28.36, 35.53, 42.7], days: [7, 9] },
      economy: { prices: [5.53, 7.72, 9.9, 14.26, null, null, null, null, null, null, null], days: [8, 12] },
    },
  },
  IB: {
    name: 'Spain (Balearic Islands)',
    eu: true,
    rates: {
      premium: { prices: [19.07, 19.52, 20.43, 22.23, 24.04, 27.65, 37.38, 47.11, 56.84, 66.57, 76.3], days: [13, 16] },
      standard: { prices: [14.34, 16.8, 17.67, 20.09, 22.5, 26.66, 36.05, 45.43, 54.81, 64.19, 73.58], days: [14, 17] },
      economy: { prices: [5.57, 7.76, 9.94, 14.29, null, null, null, null, null, null, null], days: [14, 17] },
    },
  },
  SE: {
    name: 'Sweden',
    eu: true,
    rates: {
      premium: { prices: [15.33, 15.38, 15.48, 15.69, 15.9, 16.32, 18.63, 20.87, 23.25, null, null], days: [4, 6] },
      standard: { prices: [8.1, 9.45, 10.13, 11.0, 11.88, 12.96, 15.23, 17.42, 19.76, null, null], days: [4, 6] },
      economy: { prices: [4.79, 6.42, 7.49, 9.62, null, null, null, null, null, null, null], days: [5, 9] },
    },
  },
  NIR: {
    name: 'Great Britain (Northern Ireland)',
    eu: true,
    rates: {
      premium: { prices: [17.37, 17.82, 18.72, 20.51, 23.44, 27.02, 36.68, 46.34, 56.0, 65.66, 75.32], days: [7, 11] },
      standard: { prices: [12.39, 14.18, 15.71, 18.12, 21.57, 25.7, 35.02, 44.33, 53.65, 62.96, 72.28], days: [8, 13] },
      economy: { prices: [4.6, 6.29, 7.48, 9.85, null, null, null, null, null, null, null], days: [11, 23] },
    },
  },

  // ===================== NON-EU — KEY MARKETS =====================
  US: {
    name: 'United States of America',
    eu: false,
    duty: { device: 0.2, commaFour: 0.2, harness: 0.2, deMinimis: '$800 — single Asius v1 (~$430) enters duty-free' },
    rates: {
      premium: { prices: [35.68, 37.82, 42.09, 50.64, 59.19, 76.29, 119.04, 161.79, 204.54, 247.29, 290.04], days: [5, 13] },
      standard: { prices: [16.87, 19.27, 22.03, 31.23, 40.42, 58.13, 101.4, 144.67, 187.93, 231.2, 274.47], days: [8, 19] },
      economy: { prices: [7.91, 10.1, 15.73, 24.5, null, null, null, null, null, null, null], days: [10, 20] },
    },
  },
  CA: {
    name: 'Canada',
    eu: false,
    duty: { device: 0, commaFour: 0, harness: 0, deMinimis: 'C$20' },
    rates: {
      premium: { prices: [26.46, 29.24, 34.82, 45.96, 57.11, 79.4, 135.12, 190.85, 246.57, 302.3, 358.02], days: [6, 13] },
      standard: { prices: [19.75, 22.89, 27.14, 38.58, 50.03, 72.25, 126.79, 181.33, 235.87, 290.41, 344.95], days: [7, 14] },
      economy: { prices: [12.75, 23.36, 42.37, 80.39, null, null, null, null, null, null, null], days: [9, 12] },
    },
  },
  GB: {
    name: 'Great Britain',
    eu: false,
    duty: { device: 0, commaFour: 0, harness: 0, deMinimis: '£135' },
    rates: {
      premium: { prices: [17.37, 17.82, 18.72, 20.51, 23.44, 27.02, 36.68, 46.34, 56.0, 65.66, 75.32], days: [5, 7] },
      standard: { prices: [12.39, 14.18, 15.71, 18.12, 21.57, 25.7, 35.02, 44.33, 53.65, 62.96, 72.28], days: [5, 9] },
      economy: { prices: [4.6, 6.29, 7.48, 9.85, null, null, null, null, null, null, null], days: [6, 9] },
    },
  },
  AU: {
    name: 'Australia',
    eu: false,
    duty: { device: 0, commaFour: 0, harness: 0.05, deMinimis: 'A$1000' },
    rates: {
      premium: { prices: [27.65, 31.25, 38.46, 52.88, 67.29, 96.12, 168.2, 240.27, 312.35, null, null], days: [13, 25] },
      standard: { prices: [17.08, 20.75, 26.07, 38.38, 50.69, 74.64, 133.5, 192.36, 251.22, 310.08, 368.94], days: [14, 26] },
      economy: { prices: [11.45, 19.75, 34.15, 62.96, null, null, null, null, null, null, null], days: [14, 26] },
    },
  },
  JP: {
    name: 'Japan',
    eu: false,
    duty: { device: 0, commaFour: 0, harness: 0, deMinimis: '¥10000 (~$67)' },
    rates: {
      premium: { prices: [40.36, 41.78, 44.63, 50.31, 56.0, 67.37, 95.79, 124.22, 152.64, 181.07, 209.49], days: [6, 13] },
      standard: { prices: [14.15, 16.78, 20.02, 26.85, 33.68, 46.67, 78.12, 109.58, 141.03, 172.49, 203.94], days: [7, 14] },
      economy: { prices: [8.36, 14.61, 24.6, 44.59, null, null, null, null, null, null, null], days: [10, 17] },
    },
  },
  KR: {
    name: 'South Korea',
    eu: false,
    duty: { device: 0, commaFour: 0, harness: 0, deMinimis: '$150' },
    rates: {
      premium: { prices: [35.99, 37.32, 39.99, 45.33, 50.67, 61.35, 88.05, 114.75, 141.45, 168.15, 194.85], days: [25, 34] },
      standard: { prices: [15.95, 18.5, 20.9, 27.53, 34.16, 46.74, 77.18, 107.62, 138.06, 168.51, 198.95], days: [25, 34] },
      economy: { prices: [5.7, 8.83, 12.58, 20.08, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  NO: {
    name: 'Norway',
    eu: false,
    duty: { device: 0, commaFour: 0, harness: 0, deMinimis: 'NOK 3000 (~$270)' },
    rates: {
      standard: { prices: [12.74, 14.39, 15.66, 17.52, 19.39, 22.44, 29.05, 35.67, 42.28, 48.9, 55.51], days: [7, 13] },
      economy: { prices: [6.29, 8.31, 9.86, 12.95, null, null, null, null, null, null, null], days: [10, 14] },
    },
  },
  CH: {
    name: 'Switzerland',
    eu: false,
    duty: { device: 0, commaFour: 0, harness: 0, deMinimis: 'CHF 5 duty amount' },
    rates: {
      premium: { prices: [15.85, 16.18, 16.83, 18.13, 20.23, 22.83, 30.04, 37.25, 44.46, 51.67, 58.88], days: [8, 11] },
      standard: { prices: [11.64, 13.0, 13.93, 15.86, 18.52, 21.71, 28.66, 35.61, 42.57, 49.52, 56.47], days: [9, 12] },
      economy: { prices: [6.92, 8.28, 8.79, 9.81, null, null, null, null, null, null, null], days: [11, 14] },
    },
  },
  NZ: {
    name: 'New Zealand',
    eu: false,
    duty: { device: 0, commaFour: 0, harness: 0.05, deMinimis: 'NZ$1000' },
    rates: {
      premium: { prices: [27.09, 31.91, 41.54, 60.8, 80.06, 118.58, 214.88, 311.18, 407.48, 503.78, 600.08], days: [11, 20] },
      standard: { prices: [20.7, 25.29, 31.77, 47.78, 63.79, 95.13, 172.49, 249.84, 327.2, 404.55, 481.91], days: [12, 21] },
      economy: { prices: [11.61, 20.78, 36.62, 68.3, null, null, null, null, null, null, null], days: [15, 24] },
    },
  },
  SG: {
    name: 'Singapore',
    eu: false,
    duty: { device: 0, commaFour: 0, harness: 0, deMinimis: 'S$400' },
    rates: {
      premium: { prices: [27.94, 29.03, 31.2, 35.55, 39.9, 48.6, 71.33, 94.05, 115.8, 137.55, 159.3], days: [25, 34] },
      standard: { prices: [13.66, 15.99, 17.94, 23.48, 29.01, 39.41, 64.38, 89.36, 114.33, 139.31, 164.28], days: [25, 34] },
      economy: { prices: [5.14, 7.93, 11.01, 17.17, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  HK: {
    name: 'Hong Kong',
    eu: false,
    duty: { device: 0, commaFour: 0, harness: 0, deMinimis: 'No duty at all — free port' },
    rates: {
      premium: { prices: [32.75, 33.77, 35.81, 39.89, 50.79, 58.95, 79.35, 99.75, 120.15, 140.55, 160.95], days: [11, 17] },
      standard: { prices: [19.84, 22.11, 23.95, 29.79, 35.64, 46.66, 73.18, 99.71, 126.24, 152.77, 179.29], days: [12, 18] },
      economy: { prices: [5.11, 7.85, 10.82, 16.77, null, null, null, null, null, null, null], days: [12, 18] },
    },
  },
  CN: {
    name: 'China',
    eu: false,
    duty: { device: 0, commaFour: 0.03, harness: 0.06, deMinimis: 'CNY 50 duty amount' },
    rates: {
      premium: { prices: [19.7, 21.98, 26.55, 35.69, 44.82, 63.09, 108.77, 154.44, 200.12, 245.79, 291.47], days: [11, 21] },
      standard: { prices: [14.75, 17.28, 19.63, 26.91, 34.18, 48.06, 81.74, 115.43, 149.11, 182.79, 216.47], days: [12, 22] },
      economy: { prices: [5.32, 8.29, 11.73, 18.6, null, null, null, null, null, null, null], days: [15, 23] },
    },
  },
  IN: {
    name: 'India',
    eu: false,
    duty: { device: 0.1, commaFour: 0.15, harness: 0.1, deMinimis: 'None' },
    rates: {
      premium: { prices: [27.54, 28.63, 30.8, 35.13, 39.47, 48.14, 69.81, 91.49, 113.16, 134.84, 156.51], days: [12, 20] },
      standard: { prices: [16.67, 18.55, 19.63, 23.85, 28.08, 35.86, 54.28, 72.71, 91.14, 109.57, 127.99], days: [13, 21] },
      economy: { prices: [4.98, 7.4, 9.76, 14.46, null, null, null, null, null, null, null], days: [15, 14] },
    },
  },
  TR: {
    name: 'Turkey',
    eu: false,
    duty: { device: 0, commaFour: 0, harness: 0, deMinimis: '€22' },
    rates: {
      premium: { prices: [35.1, 35.54, 36.44, 38.22, 40.01, 43.58, 52.5, 61.43, 70.35, 79.28, 88.2], days: [6, 16] },
      standard: { prices: [20.15, 21.9, 22.71, 27.73, 32.75, 42.12, 64.53, 86.94, 109.35, 131.76, 154.17], days: [7, 17] },
      economy: { prices: [7.0, 11.86, 19.08, 33.52, null, null, null, null, null, null, null], days: [10, 20] },
    },
  },
  IL: {
    name: 'Israel',
    eu: false,
    duty: { device: 0, commaFour: 0, harness: 0, deMinimis: '~$75' },
    rates: {
      premium: { prices: [35.17, 35.69, 36.74, 38.82, 40.91, 45.08, 55.5, 65.93, 76.35, null, null], days: [8, 15] },
      standard: { prices: [14.32, 16.13, 17.74, 21.32, 24.89, 31.37, 46.56, 61.75, 76.94, 92.12, 107.31], days: [9, 16] },
      economy: { prices: [7.91, 13.37, 21.81, 38.68, null, null, null, null, null, null, null], days: [12, 18] },
    },
  },
  SA: {
    name: 'Saudi Arabia',
    eu: false,
    duty: { device: 0.05, commaFour: 0.05, harness: 0.05, deMinimis: 'SAR 1000 (~$267)' },
    rates: {
      premium: { prices: [33.93, 35.17, 37.64, 42.57, 47.51, 57.38, 82.05, 106.73, 131.4, 156.08, 180.75], days: [25, 34] },
      standard: { prices: [11.22, 13.68, 15.9, 22.44, 28.97, 41.36, 71.33, 101.3, 131.27, 161.24, 191.21], days: [25, 34] },
      economy: { prices: [8.33, 14.22, 23.51, 42.07, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  AE: {
    name: 'United Arab Emirates',
    eu: false,
    duty: { device: 0.05, commaFour: 0.05, harness: 0.05, deMinimis: 'AED 1000 (~$272)' },
    rates: {
      premium: { prices: [31.34, 31.94, 33.12, 35.49, 37.86, 42.6, 54.45, 66.3, 78.15, 90.0, 101.85], days: [10, 17] },
      standard: { prices: [10.49, 12.37, 13.43, 16.96, 20.48, 26.85, 41.77, 56.69, 71.6, 86.52, 101.44], days: [11, 18] },
      economy: { prices: [4.81, 7.22, 9.52, 14.14, null, null, null, null, null, null, null], days: [11, 18] },
    },
  },
  ZA: {
    name: 'South Africa',
    eu: false,
    duty: { device: 0, commaFour: 0, harness: 0.1, deMinimis: 'ZAR 500' },
    rates: {
      premium: { prices: [29.21, 31.57, 36.29, 45.72, 55.16, 74.03, 121.2, 168.38, 215.55, 262.73, 309.9], days: [25, 34] },
      standard: { prices: [16.99, 20.47, 24.71, 35.48, 46.25, 67.12, 118.29, 169.45, 220.62, 271.78, 322.95], days: [25, 34] },
      economy: { prices: [8.52, 14.91, 25.17, 45.69, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  TH: {
    name: 'Thailand',
    eu: false,
    duty: { device: 0, commaFour: 0, harness: 0.05, deMinimis: 'THB 1500 (~$40)' },
    rates: {
      standard: { prices: [13.52, 15.91, 18.0, 24.1, 30.2, 41.73, 69.54, 97.35, 125.16, 152.97, 180.78], days: [25, 34] },
      economy: { prices: [5.28, 8.15, 11.4, 17.89, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  MX: {
    name: 'Mexico',
    eu: false,
    duty: { device: 0, commaFour: 0.05, harness: 0.05, deMinimis: '$50' },
    rates: {
      premium: { prices: [36.35, 38.33, 42.3, 50.24, 58.17, 74.04, 113.72, 153.39, 193.07, 232.74, 272.42], days: [25, 34] },
      standard: { prices: [12.3, 15.43, 19.01, 27.93, 36.86, 54.03, 95.94, 137.86, 179.78, 221.7, 263.61], days: [25, 34] },
      economy: { prices: [5.88, 9.41, 13.98, 23.1, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  BR: {
    name: 'Brazil',
    eu: false,
    duty: { device: 0.12, commaFour: 0.14, harness: 0.14, deMinimis: '$50' },
    rates: {
      premium: { prices: [35.06, 37.42, 42.14, 51.57, 61.01, 79.88, 127.05, 174.23, 221.4, 268.58, 315.75], days: [14, 28] },
      standard: { prices: [18.24, 21.71, 25.95, 37.6, 49.25, 71.87, 127.43, 182.98, 238.53, 294.08, 349.64], days: [15, 28] },
      economy: { prices: [11.98, 21.78, 39.19, 74.01, null, null, null, null, null, null, null], days: [15, 28] },
    },
  },

  // ===================== NON-EU — REST OF WORLD =====================
  AF: {
    name: 'Afghanistan',
    eu: false,
    rates: {
      standard: { prices: [21.3, 24.02, 26.74, 36.03, 45.32, 63.22, 106.96, 150.7, 194.44, 238.18, 281.92], days: [25, 34] },
      economy: { prices: [7.94, 13.36, 21.69, 38.35, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  AL: {
    name: 'Albania',
    eu: false,
    rates: {
      premium: { prices: [30.3, 31.79, 34.79, 40.77, 46.76, 58.73, 88.65, 118.58, 148.5, null, null], days: [10, 16] },
      standard: { prices: [15.17, 17.86, 20.55, 27.28, 34.02, 46.82, 77.8, 108.78, 139.77, 170.75, 201.73], days: [11, 17] },
      economy: { prices: [8.24, 13.74, 22.24, 39.26, null, null, null, null, null, null, null], days: [11, 17] },
    },
  },
  DZ: {
    name: 'Algeria',
    eu: false,
    rates: {
      standard: { prices: [18.31, 20.76, 22.95, 29.07, 35.18, 46.74, 74.61, 102.49, 130.37, null, null], days: [25, 34] },
      economy: { prices: [8.77, 15.02, 25.01, 45.0, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  AD: {
    name: 'Andorra',
    eu: false,
    rates: {
      standard: { prices: [24.03, 25.78, 26.6, 29.71, 32.83, 38.39, 51.29, 64.18, 77.07, 89.96, 102.86], days: [25, 34] },
      economy: { prices: [7.77, 11.69, 17.03, 27.72, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  AO: {
    name: 'Angola',
    eu: false,
    rates: {
      standard: { prices: [19.33, 22.56, 26.33, 35.02, 43.71, 60.43, 101.2, 141.97, 182.74, null, null], days: [25, 34] },
      economy: { prices: [7.56, 11.16, 15.87, 25.28, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  AG: {
    name: 'Antigua and Barbuda',
    eu: false,
    rates: {
      standard: { prices: [14.58, 17.81, 21.57, 30.27, 38.96, 55.67, 96.44, 137.21, 177.98, null, null], days: [25, 34] },
      economy: { prices: [7.44, 10.92, 15.39, 24.33, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  AR: {
    name: 'Argentina',
    eu: false,
    rates: {
      premium: { prices: [29.34, 32.81, 39.74, 53.6, 67.46, 95.18, 164.48, 233.78, 303.08, null, null], days: [11, 19] },
      standard: { prices: [17.09, 20.57, 24.81, 35.73, 46.66, 67.82, 119.73, 171.64, 223.55, 275.45, 327.36], days: [12, 20] },
      economy: { prices: [13.44, 24.35, 43.68, 82.34, null, null, null, null, null, null, null], days: [12, 20] },
    },
  },
  AM: {
    name: 'Armenia',
    eu: false,
    rates: {
      premium: { prices: [30.18, 31.94, 35.48, 42.54, 49.61, 63.74, 99.06, 134.39, 169.71, null, null], days: [8, 13] },
      standard: { prices: [17.37, 19.76, 21.84, 27.93, 34.02, 45.52, 73.26, 101.01, 128.75, 156.49, 184.23], days: [9, 14] },
      economy: { prices: [7.95, 13.18, 21.12, 37.01, null, null, null, null, null, null, null], days: [9, 14] },
    },
  },
  AW: {
    name: 'Aruba',
    eu: false,
    rates: {
      standard: { prices: [17.18, 21.34, 25.58, 35.83, 46.08, 65.89, 114.43, 162.96, 211.49, null, null], days: [25, 34] },
      economy: { prices: [8.67, 13.2, 19.77, 32.92, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  AZ: {
    name: 'Azerbaijan',
    eu: false,
    rates: {
      premium: { prices: [31.38, 32.02, 33.29, 35.82, 38.36, 43.43, 56.1, 68.78, 81.45, 94.13, 106.8], days: [25, 34] },
      standard: { prices: [14.26, 16.18, 17.32, 21.8, 26.28, 34.57, 54.28, 73.99, 93.7, null, null], days: [25, 34] },
      economy: { prices: [7.52, 12.3, 19.37, 33.51, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  BS: {
    name: 'Bahamas',
    eu: false,
    rates: {
      standard: { prices: [17.03, 20.44, 24.56, 33.99, 43.43, 61.63, 106.11, 150.59, 195.08, null, null], days: [25, 34] },
      economy: { prices: [8.67, 13.2, 19.77, 32.92, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  BH: {
    name: 'Bahrain',
    eu: false,
    rates: {
      standard: { prices: [17.62, 20.38, 23.21, 30.46, 37.71, 51.53, 85.08, 118.62, 152.17, null, null], days: [25, 34] },
      economy: { prices: [7.44, 10.92, 15.39, 24.33, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  BD: {
    name: 'Bangladesh',
    eu: false,
    rates: {
      standard: { prices: [16.56, 20.91, 25.57, 36.92, 48.28, 70.31, 124.38, 178.44, 232.51, null, null], days: [25, 34] },
      economy: { prices: [7.56, 11.16, 15.87, 25.28, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  BB: {
    name: 'Barbados',
    eu: false,
    rates: {
      standard: { prices: [15.82, 19.76, 23.6, 32.62, 41.63, 59.0, 101.39, 143.78, 186.17, null, null], days: [25, 34] },
      economy: { prices: [7.44, 10.92, 15.39, 24.33, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  BZ: {
    name: 'Belize',
    eu: false,
    rates: {
      standard: { prices: [20.57, 24.25, 28.9, 40.2, 51.5, 73.43, 127.22, 181.02, 234.82, null, null], days: [25, 34] },
      economy: { prices: [8.43, 12.72, 18.82, 31.0, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  BJ: {
    name: 'Benin',
    eu: false,
    rates: {
      standard: { prices: [15.48, 18.31, 21.26, 28.46, 35.65, 49.37, 82.65, 115.92, 149.2, 182.48, 215.76], days: [25, 34] },
      economy: { prices: [8.43, 12.72, 18.82, 31.0, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  BM: {
    name: 'Bermuda',
    eu: false,
    rates: {
      standard: { prices: [19.31, 22.32, 25.64, 33.87, 42.11, 57.9, 96.38, 134.85, 173.33, null, null], days: [25, 34] },
      economy: { prices: [9.76, 15.41, 24.2, 41.78, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  BO: {
    name: 'Bolivia',
    eu: false,
    rates: {
      standard: { prices: [22.47, 26.84, 32.89, 46.79, 60.7, 87.83, 154.66, 221.48, 288.31, 355.13, 421.96], days: [25, 34] },
      economy: { prices: [8.43, 12.72, 18.82, 31.0, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  BA: {
    name: 'Bosnia and Herzegovina',
    eu: false,
    rates: {
      premium: { prices: [27.48, 28.11, 29.37, 31.89, 34.41, 39.45, 52.05, 64.65, 77.25, 89.85, 102.45], days: [25, 34] },
      standard: { prices: [13.83, 16.43, 17.56, 21.67, 25.77, 33.3, 51.12, 68.94, 86.76, 104.58, 122.4], days: [25, 34] },
      economy: { prices: [7.56, 11.16, 15.87, 25.28, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  BW: {
    name: 'Botswana',
    eu: false,
    rates: {
      standard: { prices: [24.04, 27.92, 32.98, 45.08, 57.17, 80.69, 138.47, 196.25, 254.03, 311.81, 369.59], days: [25, 34] },
      economy: { prices: [8.03, 12.1, 17.74, 29.02, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  CL: {
    name: 'Chile',
    eu: false,
    rates: {
      premium: { prices: [33.02, 36.23, 42.63, 55.44, 68.25, 93.87, 157.92, 221.97, 286.02, 350.07, 414.12], days: [13, 20] },
      standard: { prices: [19.29, 22.69, 26.8, 38.66, 50.53, 73.59, 130.22, 186.85, 243.49, 300.12, 356.75], days: [14, 21] },
      economy: { prices: [6.13, 9.91, 14.97, 25.08, null, null, null, null, null, null, null], days: [14, 23] },
    },
  },
  CO: {
    name: 'Colombia',
    eu: false,
    rates: {
      premium: { prices: [27.11, 29.32, 33.74, 42.57, 51.41, 69.08, 113.25, 157.43, 201.6, 245.78, 289.95], days: [16, 26] },
      standard: { prices: [19.82, 23.16, 27.14, 38.62, 50.11, 72.41, 127.16, 181.9, 236.64, 291.38, 346.13], days: [17, 27] },
      economy: { prices: [9.78, 16.83, 28.42, 51.6, null, null, null, null, null, null, null], days: [17, 27] },
    },
  },
  CR: {
    name: 'Costa Rica',
    eu: false,
    rates: {
      premium: { prices: [29.27, 31.1, 34.77, 42.11, 49.83, 64.5, 101.57, 138.63, 175.31, 211.98, 248.66], days: [14, 21] },
      standard: { prices: [17.64, 20.64, 23.94, 33.45, 42.97, 61.33, 106.22, 151.11, 195.99, 240.88, 285.77], days: [15, 22] },
      economy: { prices: [8.28, 14.03, 23.04, 41.06, null, null, null, null, null, null, null], days: [15, 25] },
    },
  },
  EG: {
    name: 'Egypt',
    eu: false,
    rates: {
      premium: { prices: [28.25, 29.66, 32.46, 38.07, 43.68, 54.9, 82.95, 111.0, 139.05, 167.1, 195.15], days: [7, 14] },
      standard: { prices: [15.38, 17.99, 20.51, 28.01, 35.52, 49.86, 84.69, 119.52, 154.35, 189.18, 224.01], days: [8, 15] },
      economy: { prices: [5.65, 8.75, 12.45, 19.84, null, null, null, null, null, null, null], days: [11, 18] },
    },
  },
  GE: {
    name: 'Georgia',
    eu: false,
    rates: {
      premium: { prices: [32.12, 32.97, 34.68, 38.1, 41.52, 48.36, 65.46, 82.56, 99.66, null, null], days: [10, 25] },
      standard: { prices: [19.75, 21.8, 23.21, 29.36, 35.52, 47.16, 75.24, 103.32, 131.4, 159.48, 187.56], days: [11, 26] },
      economy: { prices: [5.13, 7.71, 10.37, 15.7, null, null, null, null, null, null, null], days: [13, 28] },
    },
  },
  IS: {
    name: 'Iceland',
    eu: false,
    rates: {
      premium: { prices: [45.64, 47.29, 50.58, 57.17, 63.75, 76.92, 109.85, 142.77, 175.7, 208.62, 241.55], days: [4, 9] },
      standard: { prices: [20.02, 22.85, 25.81, 32.41, 40.95, 53.47, 83.78, 114.09, 144.4, 174.7, 205.01], days: [5, 10] },
      economy: { prices: [8.07, 11.95, 17.21, 27.73, null, null, null, null, null, null, null], days: [8, 13] },
    },
  },
  ID: {
    name: 'Indonesia',
    eu: false,
    rates: {
      premium: { prices: [27.33, 27.82, 28.79, 30.72, 34.61, 38.48, 48.15, 65.63, 75.3, 84.98, 94.65], days: [25, 34] },
      standard: { prices: [15.78, 17.57, 18.44, 23.72, 29.0, 38.88, 62.57, 86.27, 109.96, 133.65, 157.34], days: [25, 34] },
      economy: { prices: [7.67, 13.01, 21.2, 37.58, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  KZ: {
    name: 'Kazakhstan',
    eu: false,
    rates: {
      premium: { prices: [35.67, 36.69, 38.73, 42.81, 46.89, 55.05, 75.45, 95.85, 116.25, null, null], days: [6, 12] },
      standard: { prices: [22.74, 25.01, 26.85, 36.1, 45.35, 63.17, 106.7, 150.24, 193.78, 237.32, 280.85], days: [7, 13] },
      economy: { prices: [5.44, 8.47, 12.02, 19.14, null, null, null, null, null, null, null], days: [10, 16] },
    },
  },
  KE: {
    name: 'Kenya',
    eu: false,
    rates: {
      standard: { prices: [12.74, 15.2, 17.42, 23.49, 29.57, 41.04, 68.72, 96.39, 124.07, 151.74, 179.42], days: [25, 34] },
      economy: { prices: [8.02, 13.3, 21.37, 37.51, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  KW: {
    name: 'Kuwait',
    eu: false,
    rates: {
      premium: { prices: [25.92, 26.94, 28.98, 33.06, 37.14, 45.3, 65.7, 86.1, 106.5, 126.9, 147.3], days: [25, 34] },
      standard: { prices: [11.81, 14.07, 15.92, 20.88, 25.85, 35.11, 57.25, 79.39, 101.53, 123.67, 145.81], days: [25, 34] },
      economy: { prices: [7.59, 12.69, 20.39, 35.8, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  MY: {
    name: 'Malaysia',
    eu: false,
    rates: {
      premium: { prices: [35.03, 36.38, 39.08, 44.48, 49.88, 60.68, 87.68, 114.68, 141.68, 168.68, 195.68], days: [25, 34] },
      standard: { prices: [13.98, 16.54, 18.98, 25.49, 32.0, 44.33, 74.17, 104.0, 133.84, 163.67, 193.51], days: [25, 34] },
      economy: { prices: [5.44, 8.47, 12.02, 19.14, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  PH: {
    name: 'Philippines',
    eu: false,
    rates: {
      premium: { prices: [28.16, 29.48, 32.1, 37.35, 42.6, 53.1, 79.35, 105.6, 131.85, null, null], days: [25, 34] },
      standard: { prices: [10.4, 12.93, 15.3, 21.98, 28.66, 41.35, 72.06, 102.78, 133.49, 164.2, 194.91], days: [25, 34] },
      economy: { prices: [8.39, 14.05, 22.86, 40.49, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  QA: {
    name: 'Qatar',
    eu: false,
    rates: {
      premium: { prices: [30.81, 32.83, 36.86, 44.91, 52.97, 69.08, 109.35, 149.63, 189.9, 230.18, 270.45], days: [25, 34] },
      standard: { prices: [11.97, 14.82, 17.83, 25.29, 32.74, 46.97, 81.53, 116.09, 150.65, 185.21, 219.77], days: [25, 34] },
      economy: { prices: [8.92, 15.36, 25.74, 46.5, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  RS: {
    name: 'Serbia',
    eu: false,
    rates: {
      premium: { prices: [27.37, 27.89, 28.94, 31.02, 33.11, 37.28, 47.7, 58.13, 68.55, 78.98, 89.4], days: [25, 34] },
      standard: { prices: [16.04, 17.86, 18.79, 22.07, 25.35, 31.24, 44.94, 58.64, 72.35, 86.05, 99.75], days: [25, 34] },
      economy: { prices: [6.6, 11.06, 17.48, 30.31, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  TW: {
    name: 'Taiwan',
    eu: false,
    rates: {
      standard: { prices: [14.75, 17.28, 19.63, 26.91, 34.18, 48.06, 81.74, 115.43, 149.11, 182.79, 216.47], days: [25, 34] },
      economy: { prices: [6.34, 10.39, 15.98, 27.16, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  UA: {
    name: 'Ukraine',
    eu: false,
    rates: {
      premium: { prices: [34.95, 35.24, 35.84, 37.02, 38.21, 40.58, 46.5, 52.43, 58.35, 64.28, 70.2], days: [7, 16] },
      standard: { prices: [9.55, 11.17, 11.7, 13.96, 16.21, 20.05, 28.62, 37.19, 45.77, 54.34, 62.91], days: [8, 17] },
      economy: { prices: [4.48, 5.37, 8.39, 11.92, null, null, null, null, null, null, null], days: [11, 21] },
    },
  },
  UY: {
    name: 'Uruguay',
    eu: false,
    rates: {
      standard: { prices: [26.15, 30.39, 36.17, 49.88, 63.6, 90.36, 156.24, 222.12, 288.0, 353.88, 419.76], days: [25, 34] },
      economy: { prices: [8.03, 12.1, 17.74, 29.02, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  VN: {
    name: 'Vietnam',
    eu: false,
    rates: {
      standard: { prices: [11.58, 13.93, 15.94, 22.05, 28.15, 39.68, 67.49, 95.3, 123.11, 150.92, 178.73], days: [25, 34] },
      economy: { prices: [5.49, 8.4, 11.72, 18.35, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },

  // ===================== ADDITIONAL NON-EU =====================
  PT3: {
    name: 'Portugal (Madeira, Azores)',
    eu: true,
    rates: {
      premium: { prices: [27.37, 28.15, 29.72, 32.86, 38.46, 44.73, 61.11, 77.49, 93.87, 110.25, 126.63], days: [11, 20] },
      standard: { prices: [22.34, 24.45, 26.64, 30.33, 36.41, 43.13, 58.93, 74.72, 90.52, 106.31, 122.11], days: [12, 21] },
      economy: { prices: [5.93, 8.42, 11.19, 16.74, null, null, null, null, null, null, null], days: [15, 24] },
    },
  },
  IC: {
    name: 'Spain (Canary Islands)',
    eu: false,
    rates: {
      premium: { prices: [33.46, 33.92, 34.82, 36.62, 38.43, 42.04, 51.77, 61.5, 71.23, 80.96, 90.69], days: [25, 34] },
      standard: { prices: [28.89, 30.68, 31.55, 33.97, 36.38, 40.54, 49.92, 59.31, 68.69, 78.07, 87.45], days: [14, 17] },
      economy: { prices: [6.33, 8.82, 11.29, 16.24, null, null, null, null, null, null, null], days: [14, 17] },
    },
  },
  EA: {
    name: 'Spain (Ceuta, Melilla)',
    eu: false,
    rates: {
      premium: { prices: [15.14, 15.59, 16.49, 18.3, 21.94, 25.55, 35.28, 45.01, 54.74, 64.47, 74.2], days: [13, 16] },
      standard: { prices: [11.22, 13.01, 13.88, 16.29, 20.48, 24.64, 34.02, 43.4, 52.79, 62.17, 71.55], days: [14, 17] },
      economy: { prices: [6.33, 8.82, 11.29, 16.24, null, null, null, null, null, null, null], days: [14, 17] },
    },
  },
  AX: {
    name: 'Finland (Åland Islands)',
    eu: true,
    rates: {
      premium: { prices: [25.07, 25.14, 25.29, 25.59, 25.89, 26.49, 31.85, 34.1, 36.35, 38.6, 40.85], days: [3, 7] },
      standard: { prices: [12.23, 13.65, 14.46, 15.4, 16.35, 17.56, 20.28, 22.3, 24.33, 26.35, 28.38], days: [4, 7] },
      economy: { prices: [6.55, 8.8, 10.79, 14.77, null, null, null, null, null, null, null], days: [4, 7] },
    },
  },
  MD: {
    name: 'Moldova',
    eu: false,
    rates: {
      premium: { prices: [31.72, 32.69, 34.64, 38.52, 42.41, 50.18, 69.6, 89.03, 108.45, 127.88, 147.3], days: [5, 10] },
      standard: { prices: [16.09, 18.31, 20.06, 25.83, 31.59, 42.44, 68.57, 94.69, 120.81, 146.93, 173.06], days: [6, 11] },
      economy: { prices: [7.8, 12.86, 20.49, 35.76, null, null, null, null, null, null, null], days: [9, 15] },
    },
  },
  ME: {
    name: 'Montenegro',
    eu: false,
    rates: {
      premium: { prices: [28.08, 29.32, 31.79, 36.72, 41.66, 51.53, 76.2, 100.88, 125.55, 150.23, 174.9], days: [25, 34] },
      standard: { prices: [16.38, 18.84, 21.06, 26.89, 32.72, 43.71, 70.17, 96.63, 123.09, 149.55, 176.01], days: [25, 34] },
      economy: { prices: [7.57, 12.63, 20.23, 35.44, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  MA: {
    name: 'Morocco',
    eu: false,
    rates: {
      standard: { prices: [25.58, 28.89, 32.81, 42.13, 51.46, 69.44, 113.39, 157.33, 201.27, 245.21, 289.16], days: [25, 34] },
      economy: { prices: [7.56, 11.16, 15.87, 25.28, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  NG: {
    name: 'Nigeria',
    eu: false,
    rates: {
      standard: { prices: [17.58, 20.04, 22.26, 29.2, 36.14, 49.34, 81.34, 113.33, 145.33, 177.32, 209.32], days: [25, 34] },
      economy: { prices: [8.02, 13.3, 21.37, 37.51, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  PK: {
    name: 'Pakistan',
    eu: false,
    rates: {
      premium: { prices: [24.62, 26.3, 29.64, 36.33, 43.02, 56.4, 93.75, 127.2, 160.65, 194.1, 227.55], days: [25, 34] },
      standard: { prices: [12.19, 15.05, 18.06, 25.74, 33.43, 48.11, 83.82, 119.53, 155.24, 190.94, 226.65], days: [25, 34] },
      economy: { prices: [8.38, 14.03, 22.84, 40.44, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  PE: {
    name: 'Peru',
    eu: false,
    rates: {
      premium: { prices: [29.13, 31.41, 35.97, 45.09, 54.21, 72.45, 118.05, 163.65, 209.25, 254.85, 300.45], days: [25, 34] },
      standard: { prices: [17.69, 21.09, 25.19, 36.53, 47.87, 69.88, 123.88, 177.88, 231.88, 285.88, 339.88], days: [25, 34] },
      economy: { prices: [8.89, 15.05, 24.86, 44.49, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  XK: {
    name: 'Kosovo',
    eu: false,
    rates: {
      standard: { prices: [21.06, 23.01, 24.22, 28.19, 32.16, 39.42, 56.57, 73.71, 90.86, null, null], days: [25, 34] },
      economy: { prices: [7.85, 11.74, 17.03, 27.59, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  MK: {
    name: 'North Macedonia',
    eu: false,
    rates: {
      premium: { prices: [28.53, 29.24, 30.65, 33.47, 36.29, 41.93, 56.03, 70.13, 84.23, 98.33, 112.43], days: [25, 34] },
      standard: { prices: [13.36, 15.35, 16.62, 20.7, 24.77, 32.25, 49.94, 67.62, 85.31, 102.99, 120.68], days: [25, 34] },
      economy: { prices: [7.33, 12.14, 19.25, 33.48, null, null, null, null, null, null, null], days: [25, 34] },
    },
  },
  LI: {
    name: 'Liechtenstein',
    eu: false,
    rates: {
      standard: { prices: [12.69, 14.36, 14.99, 17.67, 20.36, 25.06, 35.79, 46.52, 57.25, 67.99, 78.72], days: [6, 11] },
      economy: { prices: [7.89, 13.3, 21.61, 38.23, null, null, null, null, null, null, null], days: [9, 13] },
    },
  },
}

// Helper: get shipping price for a country, tier, and weight
export const getShippingPrice = (countryCode: string, tier: 'premium' | 'standard' | 'economy', weightKg: number): number | null => {
  const country = COUNTRIES[countryCode]
  if (!country) return null

  const tierData = country.rates[tier]
  if (!tierData) return null

  const bracketIndex = WEIGHT_BRACKETS.findIndex((max) => weightKg <= max)
  if (bracketIndex === -1) return null

  return tierData.prices[bracketIndex]
}

// Helper: get all available shipping options for a country and weight
export const getShippingOptions = (countryCode: string, weightKg: number) => {
  const country = COUNTRIES[countryCode]
  if (!country) return []

  const tiers = ['premium', 'standard', 'economy'] as const
  return tiers
    .map((tier) => {
      const price = getShippingPrice(countryCode, tier, weightKg)
      if (price === null) return null
      const tierData = country.rates[tier]!
      return { tier, price, days: tierData.days }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
}

// Helper: estimate total landed cost (shipping + duty + customs fee)
export const estimateLandedCost = (
  countryCode: string,
  tier: 'premium' | 'standard' | 'economy',
  product: keyof typeof PRODUCTS,
  weightKg: number,
  valueEur: number,
) => {
  const shippingPrice = getShippingPrice(countryCode, tier, weightKg)
  if (shippingPrice === null) return null

  const country = COUNTRIES[countryCode]
  if (!country) return null

  const shipping = shippingPrice * (1 + ADDITIONAL_FEES.fuelSurchargePercent)

  if (country.eu) {
    return { shipping, duty: 0, customsFee: 0, total: shipping }
  }

  const dutyRate = country.duty?.[product] ?? 0
  const duty = valueEur * dutyRate
  const customsFee = duty > 0 ? ADDITIONAL_FEES.customsServiceFee.fixed + duty * ADDITIONAL_FEES.customsServiceFee.percentOfDuty : 0

  return {
    shipping: Math.round(shipping * 100) / 100,
    duty: Math.round(duty * 100) / 100,
    customsFee: Math.round(customsFee * 100) / 100,
    total: Math.round((shipping + duty + customsFee) * 100) / 100,
  }
}
