import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

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

export async function hapticSuccess() {
  try {
    await Haptics.notification({ type: NotificationType.Success })
  } catch {
    // Silently fail on web/unsupported platforms
  }
}

export async function hapticError() {
  try {
    await Haptics.notification({ type: NotificationType.Error })
  } catch {
    // Silently fail on web/unsupported platforms
  }
}

export async function hapticSelectionChanged() {
  try {
    await Haptics.selectionChanged()
  } catch {
    // Silently fail on web/unsupported platforms
  }
}
