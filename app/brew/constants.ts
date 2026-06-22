// Mock data for development and testing
// Real data is fetched in server components and passed down as props

/** Mock beans data for development and testing when the database is unavailable. */
export const MOCK_BEANS = [
  {
    id: 1,
    name: 'Ethiopian Yirgacheffe',
    roster: 'Medium',
    rostery: 'Local Coffee Co',
  },
  {
    id: 2,
    name: 'Colombian Supremo',
    roster: 'Dark',
    rostery: 'Mountain Roasters',
  },
  { id: 3, name: 'Kenyan AA', roster: 'Light', rostery: 'Artisan Coffee' },
]

/** Mock methods data for development and testing when the database is unavailable. */
export const MOCK_METHODS = [
  { id: 1, name: 'Pour Over' },
  { id: 2, name: 'French Press' },
  { id: 3, name: 'AeroPress' },
]

/** Mock grinders data for development and testing when the database is unavailable. */
export const MOCK_GRINDERS = [
  { id: 1, name: 'Baratza Encore' },
  { id: 2, name: 'Comandante C40' },
  { id: 3, name: 'Timemore C2' },
]
