import { describe, expect, test } from 'bun:test'
import { parseDBC, decodeSignal, DBCSignal } from './dbc-parser'
import { getDbcFilesForFingerprint, FINGERPRINT_TO_DBC } from './dbc-files'

describe('DBC Parser', () => {
  const SAMPLE_DBC = `
VERSION ""

NS_ :

BS_:

BU_: XXX

BO_ 384 TRACK_A_0: 8 XXX
 SG_ COUNTER : 7|8@0+ (1,0) [0|255] "" XXX
 SG_ LAT_DIST : 31|11@0- (0.04,0) [-50|50] "m" XXX
 SG_ LONG_DIST : 15|13@0+ (0.04,0) [0|300] "m" XXX
 SG_ NEW_TRACK : 36|1@0+ (1,0) [0|1] "" XXX
 SG_ REL_SPEED : 47|12@0- (0.025,0) [-100|100] "m/s" XXX
 SG_ VALID : 48|1@0+ (1,0) [0|1] "" XXX

BO_ 513 MOTORS_DATA: 8 XXX
 SG_ SPEED_L : 7|16@0- (1,0) [-1000|1000] "" XXX
 SG_ SPEED_R : 23|16@0- (1,0) [-1000|1000] "" XXX
 SG_ COUNTER : 51|4@0+ (1,0) [0|15] "" XXX
`

  test('parses message definitions', () => {
    const dbc = parseDBC(SAMPLE_DBC, 'test')

    expect(dbc.name).toBe('test')
    expect(dbc.messages.size).toBe(2)

    const msg384 = dbc.messages.get(384)
    expect(msg384).toBeDefined()
    expect(msg384!.name).toBe('TRACK_A_0')
    expect(msg384!.size).toBe(8)

    const msg513 = dbc.messages.get(513)
    expect(msg513).toBeDefined()
    expect(msg513!.name).toBe('MOTORS_DATA')
  })

  test('parses signal definitions', () => {
    const dbc = parseDBC(SAMPLE_DBC, 'test')

    const msg384 = dbc.messages.get(384)!
    expect(msg384.signals.length).toBe(6)

    const counter = msg384.signals.find((s) => s.name === 'COUNTER')
    expect(counter).toBeDefined()
    expect(counter!.startBit).toBe(7)
    expect(counter!.size).toBe(8)
    expect(counter!.isLittleEndian).toBe(false) // @0 means big-endian
    expect(counter!.isSigned).toBe(false) // + means unsigned
    expect(counter!.factor).toBe(1)
    expect(counter!.offset).toBe(0)

    const latDist = msg384.signals.find((s) => s.name === 'LAT_DIST')
    expect(latDist).toBeDefined()
    expect(latDist!.isSigned).toBe(true) // - means signed
    expect(latDist!.factor).toBe(0.04)
    expect(latDist!.unit).toBe('m')
    expect(latDist!.min).toBe(-50)
    expect(latDist!.max).toBe(50)
  })

  test('parses little-endian signals', () => {
    const leDbcContent = `
BO_ 100 TEST: 8 XXX
 SG_ LE_SIGNAL : 0|16@1+ (1,0) [0|65535] "" XXX
 SG_ BE_SIGNAL : 7|16@0+ (1,0) [0|65535] "" XXX
`
    const dbc = parseDBC(leDbcContent, 'test')
    const msg = dbc.messages.get(100)!

    const leSignal = msg.signals.find((s) => s.name === 'LE_SIGNAL')
    expect(leSignal!.isLittleEndian).toBe(true) // @1 means little-endian

    const beSignal = msg.signals.find((s) => s.name === 'BE_SIGNAL')
    expect(beSignal!.isLittleEndian).toBe(false) // @0 means big-endian
  })
})

describe('Signal Decoding', () => {
  test('decodes unsigned little-endian signal', () => {
    const signal: DBCSignal = {
      name: 'TEST',
      startBit: 0,
      size: 16,
      isLittleEndian: true,
      isSigned: false,
      factor: 1,
      offset: 0,
      min: 0,
      max: 65535,
      unit: '',
    }

    // Little-endian: 0x3412 stored as [0x12, 0x34]
    const data = new Uint8Array([0x12, 0x34, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
    const value = decodeSignal(data, signal)
    expect(value).toBe(0x3412)
  })

  test('decodes unsigned big-endian signal', () => {
    const signal: DBCSignal = {
      name: 'TEST',
      startBit: 7, // MSB position in big-endian
      size: 16,
      isLittleEndian: false,
      isSigned: false,
      factor: 1,
      offset: 0,
      min: 0,
      max: 65535,
      unit: '',
    }

    // Big-endian: 0x1234 stored as [0x12, 0x34]
    const data = new Uint8Array([0x12, 0x34, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
    const value = decodeSignal(data, signal)
    expect(value).toBe(0x1234)
  })

  test('decodes signed negative value', () => {
    const signal: DBCSignal = {
      name: 'TEST',
      startBit: 0,
      size: 8,
      isLittleEndian: true,
      isSigned: true,
      factor: 1,
      offset: 0,
      min: -128,
      max: 127,
      unit: '',
    }

    // -1 in signed 8-bit = 0xFF
    const data = new Uint8Array([0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
    const value = decodeSignal(data, signal)
    expect(value).toBe(-1)
  })

  test('applies factor and offset', () => {
    const signal: DBCSignal = {
      name: 'TEST',
      startBit: 0,
      size: 8,
      isLittleEndian: true,
      isSigned: false,
      factor: 0.5,
      offset: 10,
      min: 0,
      max: 255,
      unit: '',
    }

    // raw value 100 -> physical = 100 * 0.5 + 10 = 60
    const data = new Uint8Array([100, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
    const value = decodeSignal(data, signal)
    expect(value).toBe(60)
  })

  test('decodes single bit', () => {
    const signal: DBCSignal = {
      name: 'TEST',
      startBit: 3,
      size: 1,
      isLittleEndian: true,
      isSigned: false,
      factor: 1,
      offset: 0,
      min: 0,
      max: 1,
      unit: '',
    }

    // Bit 3 set: 0b00001000 = 0x08
    const data = new Uint8Array([0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
    const value = decodeSignal(data, signal)
    expect(value).toBe(1)

    // Bit 3 not set: 0b00000000 = 0x00
    const data2 = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
    const value2 = decodeSignal(data2, signal)
    expect(value2).toBe(0)
  })
})

describe('Fingerprint to DBC Mapping', () => {
  test('returns suggested DBCs for exact match', () => {
    const dbcs = getDbcFilesForFingerprint('TOYOTA')
    expect(dbcs.length).toBeGreaterThan(0)
    expect(dbcs).toContain('toyota_tss2_adas')
  })

  test('returns suggested DBCs for partial match', () => {
    const dbcs = getDbcFilesForFingerprint('TOYOTA COROLLA 2022')
    expect(dbcs.length).toBeGreaterThan(0)
    expect(dbcs).toContain('toyota_tss2_adas')
  })

  test('returns suggested DBCs for Hyundai', () => {
    const dbcs = getDbcFilesForFingerprint('HYUNDAI SONATA')
    expect(dbcs.length).toBeGreaterThan(0)
    expect(dbcs).toContain('hyundai_kia_generic')
  })

  test('returns suggested DBCs for Kia', () => {
    const dbcs = getDbcFilesForFingerprint('KIA EV6')
    expect(dbcs.length).toBeGreaterThan(0)
    expect(dbcs).toContain('hyundai_kia_generic')
  })

  test('returns suggested DBCs for Tesla', () => {
    const dbcs = getDbcFilesForFingerprint('TESLA MODEL 3')
    expect(dbcs.length).toBeGreaterThan(0)
    expect(dbcs.some((d) => d.includes('tesla'))).toBe(true)
  })

  test('returns empty array for unknown fingerprint', () => {
    const dbcs = getDbcFilesForFingerprint('UNKNOWN CAR XYZ')
    expect(dbcs).toEqual([])
  })

  test('handles empty fingerprint', () => {
    const dbcs = getDbcFilesForFingerprint('')
    expect(dbcs).toEqual([])
  })

  test('is case insensitive', () => {
    const dbcs1 = getDbcFilesForFingerprint('toyota')
    const dbcs2 = getDbcFilesForFingerprint('TOYOTA')
    const dbcs3 = getDbcFilesForFingerprint('Toyota')

    expect(dbcs1).toEqual(dbcs2)
    expect(dbcs2).toEqual(dbcs3)
  })

  test('all mapped DBCs are in available list', () => {
    const { AVAILABLE_DBC_FILES } = require('./dbc-files')

    for (const [fingerprint, dbcs] of Object.entries(FINGERPRINT_TO_DBC)) {
      for (const dbc of dbcs as string[]) {
        expect(AVAILABLE_DBC_FILES, `DBC ${dbc} for ${fingerprint} should be in available list`).toContain(dbc)
      }
    }
  })
})
