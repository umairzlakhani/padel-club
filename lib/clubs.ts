import { IMAGES } from './images'

export type Club = {
  id: string
  name: string
  location: string
  courts: number
  pricePerHour: number
  image: string
  imageUrl: string
}

export const CLUBS: Club[] = [
  {
    id: 'legends',
    name: 'Legends Arena',
    location: 'DHA Phase 6',
    courts: 4,
    pricePerHour: 5000,
    image: '\u{1F3DF}\uFE0F',
    imageUrl: IMAGES.venues.legends,
  },
  {
    id: 'viva',
    name: 'Viva Padel',
    location: 'Clifton Block 5',
    courts: 3,
    pricePerHour: 4500,
    image: '\u{1F3BE}',
    imageUrl: IMAGES.venues.viva,
  },
  {
    id: 'padelverse',
    name: 'Padelverse',
    location: 'Bukhari Commercial',
    courts: 2,
    pricePerHour: 4000,
    image: '\u{1F3F8}',
    imageUrl: IMAGES.venues.padelverse,
  },
  {
    id: 'greenwich',
    name: 'Greenwich Padel',
    location: 'DHA Phase 8',
    courts: 3,
    pricePerHour: 5500,
    image: '\u{1F33F}',
    imageUrl: IMAGES.venues.greenwich,
  },
]
