// Unsplash stock images for the app
// Using direct Unsplash image URLs with size parameters

export const IMAGES = {
  // Dashboard hero banner — aerial padel courts at night
  dashboardHero: 'https://images.unsplash.com/photo-1673266893352-6de89e258064?w=960&h=400&fit=crop&crop=center',

  // Venue/club banners — padel courts with glass walls
  venues: {
    legends: 'https://images.unsplash.com/photo-1770230901556-4e1c0bacfb09?w=800&h=400&fit=crop&crop=center',
    viva: 'https://images.unsplash.com/photo-1673266893352-6de89e258064?w=800&h=400&fit=crop&crop=center',
    padelverse: 'https://images.unsplash.com/photo-1770230901556-4e1c0bacfb09?w=800&h=400&fit=crop&crop=center',
    greenwich: 'https://images.unsplash.com/photo-1673266893352-6de89e258064?w=800&h=400&fit=crop&crop=center',
  } as Record<string, string>,

  // Tournament banners — padel doubles match
  tournament: 'https://images.unsplash.com/photo-1673266893352-6de89e258064?w=800&h=300&fit=crop&crop=center',

  // Default player avatar
  defaultAvatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&h=200&fit=crop&crop=face',
}
