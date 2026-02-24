import { Haptics, ImpactStyle } from '@capacitor/haptics'

export async function hapticLight() {
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    // Silently fail on web/unsupported platforms
  }
}

export async function hapticMedium() {
  try {
    await Haptics.impact({ style: ImpactStyle.Medium })
  } catch {
    // Silently fail on web/unsupported platforms
  }
}

export async function hapticHeavy() {
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy })
  } catch {
    // Silently fail on web/unsupported platforms
  }
}
