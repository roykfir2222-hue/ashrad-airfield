export type FlightType = 'independent' | 'shared'
export type EntryStatus = 'waiting' | 'flying' | 'done'

export interface QueueEntry {
  id: string
  name: string
  flight_modes: FlightType[]
  duration_min: number
  position: number
  status: EntryStatus
  is_active: boolean
  is_verified: boolean
  created_at: string
  started_at: string | null
  finished_at: string | null
}
