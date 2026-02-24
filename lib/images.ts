// Unsplash stock images for the app
// Using direct Unsplash image URLs with size parameters

export const IMAGES = {
  // Dashboard hero banner — padel action shot
  dashboardHero: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=960&h=400&fit=crop&crop=center',

  // Venue/club banners
  venues: {
    legends: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800&h=400&fit=crop&crop=center',
    viva: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&h=400&fit=crop&crop=center',
    padelverse: 'https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?w=800&h=400&fit=crop&crop=center',
    greenwich: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800&h=400&fit=crop&crop=center',
  } as Record<string, string>,

  // Tournament banners
  tournament: 'https://images.unsplash.com/photo-1461896836934-bd45ba7b5491?w=800&h=300&fit=crop&crop=center',

  // Default player avatar
  defaultAvatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&h=200&fit=crop&crop=face',
}
