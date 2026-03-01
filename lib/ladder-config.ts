export type TierConfig = {
  name: string
  slug: string
  icon: string // SVG icon identifier
  description: string
}

export type ClubConfig = {
  name: string
  slug: string
  shortName: string
  tiers: TierConfig[]
}

export const TIERS: TierConfig[] = [
  { name: "Men's Elite", slug: 'mens-elite', icon: 'trophy', description: 'Top-tier men\'s doubles' },
  { name: "Women's Open", slug: 'womens-open', icon: 'star', description: 'Women\'s doubles ladder' },
  { name: 'Father & Son', slug: 'father-son', icon: 'users', description: 'Father-son doubles pairs' },
  { name: 'Junior', slug: 'junior', icon: 'zap', description: 'Under-18 doubles ladder' },
]

export const CLUBS: ClubConfig[] = [
  {
    name: 'Karachi Gymkhana',
    slug: 'kg',
    shortName: 'Gymkhana',
    tiers: TIERS,
  },
]

export function getClub(slug: string): ClubConfig | undefined {
  return CLUBS.find((c) => c.slug === slug)
}

export function getTier(clubSlug: string, tierSlug: string): TierConfig | undefined {
  const club = getClub(clubSlug)
  return club?.tiers.find((t) => t.slug === tierSlug)
}

export function getTierName(slug: string): string {
  const tier = TIERS.find((t) => t.slug === slug)
  return tier?.name ?? slug
}
