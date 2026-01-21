import polyline from '@mapbox/polyline'
import type { FeatureCollection, Point } from 'geojson'
import { Route } from '../../../shared/types'
import { DB } from './db'
import { env } from '../../../shared/env'

/**
 * @see {@link https://docs.mapbox.com/api/search/geocoding/#geocoding-response-object}
 */
export type ReverseGeocodingResponse = FeatureCollection<Point, ReverseGeocodingFeatureProperties> & {
  attribution: string
}

export type ReverseGeocodingFeature = ReverseGeocodingResponse['features'][number]

type ReverseGeocodingFeatureProperties = {
  feature_type: 'country' | 'region' | 'postcode' | 'district' | 'place' | 'locality' | 'neighborhood' | 'street' | 'address'
  name: string
  name_preferred: string
  place_formatted: string
  full_address: string
  context: ReverseGeocodingContextObject
}

/**
 * @see {@link https://docs.mapbox.com/api/search/geocoding/#the-context-object}
 */
type ReverseGeocodingContextObject<S = ReverseGeocodingContextSubObject> = {
  country?: S & {
    country_code: string
    country_code_alpha_3: string
  }
  region?: S & {
    region_code: string
    region_code_full: string
  }
  postcode?: S
  district?: S
  place?: S
  locality?: S
  neighborhood?: S
  street?: S
  address?: S & {
    address_number: string
    street_name: string
  }
}

type ReverseGeocodingContextSubObject = { name: string }

const POLYLINE_SAMPLE_SIZE = 50
const POLYLINE_PRECISION = 4

const getMapStyleId = (themeId: string): string => (themeId === 'light' ? env.MAPBOX_LIGHT_STYLE_ID : env.MAPBOX_DARK_STYLE_ID)

const prepareCoords = (coords: [number, number][], sampleSize: number) => {
  const sample: [number, number][] = []
  const step = Math.max(Math.floor(coords.length / sampleSize), 1)
  for (let i = 0; i < coords.length; i += step) {
    const point = coords[i]
    // 1. mapbox uses lng,lat order
    // 2. polyline output is off by 10x when precision is 4
    sample.push([point[1] * 10, point[0] * 10] as [number, number])
  }
  return sample
}

// TODO: get path colour from theme
export const getPathStaticMapUrl = (
  themeId: string,
  coords: [number, number][],
  width: number,
  height: number,
  hidpi: boolean,
  strokeWidth: number = 4,
  color: string = 'DFE0FF',
  opacity: number = 1,
) => {
  const styleId = getMapStyleId(themeId)
  const hidpiStr = hidpi ? '@2x' : ''
  const encodedPolyline = polyline.encode(prepareCoords(coords, POLYLINE_SAMPLE_SIZE), POLYLINE_PRECISION)
  const path = `path-${strokeWidth}+${color}-${opacity}(${encodeURIComponent(encodedPolyline)})`
  return `https://api.mapbox.com/styles/v1/${env.MAPBOX_USERNAME}/${styleId}/static/${path}/auto/${width}x${height}${hidpiStr}?logo=false&attribution=false&padding=30,30,30,30&access_token=${env.MAPBOX_TOKEN}`
}

export const getTileUrl = () =>
  `https://api.mapbox.com/styles/v1/${env.MAPBOX_USERNAME}/${getMapStyleId('dark')}/tiles/256/{z}/{x}/{y}@2x?access_token=${env.MAPBOX_TOKEN}`

type Position = { lng?: number | null; lat?: number | null }
export const reverseGeocode = async ({ lng, lat }: Position): Promise<ReverseGeocodingFeature | undefined> => {
  if (!lng || !lat) return
  if (Math.abs(lng) < 0.001 && Math.abs(lat) < 0.001) return

  const db = await DB.init('geocode')
  const key = `${lng.toFixed(6)},${lat.toFixed(6)}`
  const saved = await db.get<ReverseGeocodingFeature>(key)
  if (saved) return saved

  try {
    const query = new URLSearchParams({ longitude: lng.toFixed(6), latitude: lat.toFixed(6), access_token: env.MAPBOX_TOKEN })
    const resp = await fetch(`https://api.mapbox.com/search/geocode/v6/reverse?${query.toString()}`)

    if (!resp.ok) {
      console.error(new Error(`Reverse geocode lookup failed: ${resp.status} ${resp.statusText}`))
      return
    }

    // TODO: validate
    const collection = (await resp.json()) as ReverseGeocodingResponse
    const res = collection?.features?.[0]
    if (res) await db.set(key, res)
    return res
  } catch (error) {
    console.error('[geocode] Reverse geocode lookup failed', error)
    return
  }
}

export const getPlaceName = async (position: Position): Promise<string | undefined> => {
  const feature = await reverseGeocode(position)
  if (!feature) return
  const context = feature.properties.context
  return (
    [
      // context.street?.name,
      context.neighborhood?.name,
      context.place?.name,
      context.locality?.name,
      context.district?.name,
      context.region?.name,
      context.country?.name,
    ].find(Boolean) || ''
  )
}

export const getStartEndPlaceName = async (route: Route) => {
  const [start, end] = await Promise.all([
    getPlaceName({ lng: route.start_lng, lat: route.start_lat }),
    getPlaceName({ lng: route.end_lng, lat: route.end_lat }),
  ])
  return { start, end }
}
