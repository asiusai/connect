// Mapping from car fingerprint patterns to DBC file names
// Based on openpilot's car fingerprinting system

export const FINGERPRINT_TO_DBC: Record<string, string[]> = {
  // Toyota
  TOYOTA: ['toyota_tss2_adas', 'toyota_adas', 'toyota_2017_ref_pt'],
  'TOYOTA COROLLA': ['toyota_tss2_adas', 'toyota_adas'],
  'TOYOTA CAMRY': ['toyota_tss2_adas', 'toyota_adas'],
  'TOYOTA RAV4': ['toyota_tss2_adas', 'toyota_adas'],
  'TOYOTA PRIUS': ['toyota_tss2_adas', 'toyota_prius_2010_pt'],
  'TOYOTA HIGHLANDER': ['toyota_tss2_adas', 'toyota_adas'],

  // Hyundai / Kia / Genesis
  HYUNDAI: ['hyundai_kia_generic'],
  KIA: ['hyundai_kia_generic'],
  GENESIS: ['hyundai_kia_generic'],
  'HYUNDAI SONATA': ['hyundai_kia_generic'],
  'HYUNDAI ELANTRA': ['hyundai_kia_generic'],
  'HYUNDAI TUCSON': ['hyundai_kia_generic'],
  'HYUNDAI SANTA FE': ['hyundai_kia_generic'],
  'HYUNDAI IONIQ': ['hyundai_kia_generic'],
  'KIA SORENTO': ['hyundai_kia_generic'],
  'KIA STINGER': ['hyundai_kia_generic'],
  'KIA EV6': ['hyundai_kia_generic'],
  'KIA NIRO': ['hyundai_kia_generic'],

  // Honda / Acura
  HONDA: ['honda_accord_2018_can_generated'],
  ACURA: ['acura_ilx_2016_nidec'],
  'HONDA ACCORD': ['honda_accord_2018_can_generated'],
  'HONDA CIVIC': ['honda_accord_2018_can_generated'],
  'HONDA CR-V': ['honda_accord_2018_can_generated'],

  // Tesla
  TESLA: ['tesla_can', 'tesla_model3_party', 'tesla_powertrain'],
  'TESLA MODEL 3': ['tesla_model3_party', 'tesla_can'],
  'TESLA MODEL Y': ['tesla_model3_party', 'tesla_can'],
  'TESLA MODEL S': ['tesla_can', 'tesla_powertrain'],

  // GM / Chevrolet / Cadillac
  GM: ['gm_global_a_lowspeed', 'gm_global_a_chassis'],
  CHEVROLET: ['gm_global_a_lowspeed', 'gm_global_a_chassis'],
  CADILLAC: ['cadillac_ct6_powertrain', 'cadillac_ct6_chassis'],
  'CHEVROLET BOLT': ['gm_global_a_lowspeed'],
  'CHEVROLET VOLT': ['gm_global_a_lowspeed'],

  // Ford
  FORD: ['ford_lincoln_base_pt', 'ford_fusion_2018_adas'],
  'FORD FUSION': ['ford_fusion_2018_pt', 'ford_fusion_2018_adas'],
  'FORD ESCAPE': ['ford_lincoln_base_pt'],
  'FORD BRONCO': ['ford_lincoln_base_pt'],

  // Volkswagen / Audi / Skoda
  VOLKSWAGEN: ['vw_mqb', 'vw_mqbevo'],
  AUDI: ['vw_mqb', 'vw_mlb'],
  SKODA: ['vw_mqb'],
  SEAT: ['vw_mqb'],
  'VOLKSWAGEN GOLF': ['vw_mqb'],
  'VOLKSWAGEN PASSAT': ['vw_mqb'],
  'VOLKSWAGEN ID.4': ['vw_meb'],

  // Mazda
  MAZDA: ['mazda_2017', 'mazda_3_2019'],
  'MAZDA CX-5': ['mazda_2017'],
  'MAZDA CX-9': ['mazda_2017'],
  'MAZDA 3': ['mazda_3_2019'],

  // Chrysler / Jeep / Ram
  CHRYSLER: ['chrysler_cusw'],
  JEEP: ['chrysler_cusw', 'fca_giorgio'],
  RAM: ['chrysler_cusw'],
  'CHRYSLER PACIFICA': ['chrysler_pacifica_2017_hybrid_private_fusion'],

  // Comma Body
  COMMA: ['comma_body'],
  'COMMA BODY': ['comma_body'],
}

// List of all available DBC files
export const AVAILABLE_DBC_FILES = [
  'toyota_tss2_adas',
  'toyota_adas',
  'toyota_2017_ref_pt',
  'toyota_prius_2010_pt',
  'hyundai_kia_generic',
  'honda_accord_2018_can_generated',
  'tesla_can',
  'tesla_model3_party',
  'tesla_powertrain',
  'gm_global_a_lowspeed',
  'gm_global_a_chassis',
  'cadillac_ct6_powertrain',
  'cadillac_ct6_chassis',
  'ford_lincoln_base_pt',
  'ford_fusion_2018_adas',
  'ford_fusion_2018_pt',
  'vw_mqb',
  'vw_mqbevo',
  'vw_mlb',
  'vw_meb',
  'mazda_2017',
  'mazda_3_2019',
  'chrysler_cusw',
  'chrysler_pacifica_2017_hybrid_private_fusion',
  'fca_giorgio',
  'comma_body',
  'acura_ilx_2016_nidec',
]

// Get suggested DBC files for a car fingerprint
export const getDbcFilesForFingerprint = (fingerprint: string): string[] => {
  if (!fingerprint) return []

  const upper = fingerprint.toUpperCase()

  // Try exact match first
  if (FINGERPRINT_TO_DBC[upper]) {
    return FINGERPRINT_TO_DBC[upper]
  }

  // Try partial match (brand only)
  for (const [pattern, dbcs] of Object.entries(FINGERPRINT_TO_DBC)) {
    if (upper.startsWith(pattern) || upper.includes(pattern)) {
      return dbcs
    }
  }

  // Try matching brand from fingerprint
  const brands = [
    'TOYOTA',
    'HYUNDAI',
    'KIA',
    'GENESIS',
    'HONDA',
    'ACURA',
    'TESLA',
    'GM',
    'CHEVROLET',
    'CADILLAC',
    'FORD',
    'VOLKSWAGEN',
    'AUDI',
    'MAZDA',
    'CHRYSLER',
    'JEEP',
    'COMMA',
  ]

  for (const brand of brands) {
    if (upper.includes(brand) && FINGERPRINT_TO_DBC[brand]) {
      return FINGERPRINT_TO_DBC[brand]
    }
  }

  return []
}

// Base URL for fetching DBC files from OpenDBC
const OPENDBC_BASE_URL = 'https://raw.githubusercontent.com/commaai/opendbc/master/opendbc/dbc'

// Fetch a DBC file from GitHub
export const fetchDbcFile = async (name: string): Promise<string> => {
  const url = `${OPENDBC_BASE_URL}/${name}.dbc`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch DBC file: ${name}`)
  }
  return response.text()
}
