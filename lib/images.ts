// Unsplash padel-specific images for the app
// All sourced from Unsplash padel/padel-court/padel-player search pages

export const IMAGES = {
  // Dashboard hero — padel court (from padel-court search)
  dashboardHero: 'https://images.unsplash.com/photo-1709587824645-cf6dd2041e2b?w=960&h=400&fit=crop&crop=center',

  // Venue/club banners — all from padel-court & padel-player searches
  venues: {
    legends: 'https://plus.unsplash.com/premium_photo-1708692919998-e3dc853ef8a8?w=800&h=400&fit=crop&crop=center',
    viva: 'https://images.unsplash.com/photo-1709587825135-80b00570c355?w=800&h=400&fit=crop&crop=center',
    padelverse: 'https://images.unsplash.com/photo-1709587823868-735f9375ae74?w=800&h=400&fit=crop&crop=center',
    greenwich: 'https://plus.unsplash.com/premium_photo-1708692920701-19a470ecd667?w=800&h=400&fit=crop&crop=center',
  } as Record<string, string>,

  // Tournament — four men with padel rackets on court
  tournament: 'https://plus.unsplash.com/premium_photo-1768349851955-24c85837e731?w=800&h=300&fit=crop&crop=center',

  // Default player avatar
  defaultAvatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&h=200&fit=crop&crop=face',
}
