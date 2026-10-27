// Push notification plumbing: permission flow, Expo push token lifecycle,
// Android channel, foreground presentation and tap→navigation handling.
// The in-app inbox stays the source of truth (ADR 0010); push is a second channel.
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { useEffect } from "react";

import { getPushToken, setPushToken } from "../auth/session";
import { navigationRef } from "../navigation/navigationRef";

export const PUSH_CHANNEL_ID = "notifications";

// Foreground: show banner + in-list entry, play sound, bump the badge.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

let channelReady = false;

async function ensureAndroidChannel(): Promise<void> {
  if (channelReady) return;
  if (Device.osName === "Android") {
    await Notifications.setNotificationChannelAsync(PUSH_CHANNEL_ID, {
      name: "Bildirimler",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#007D9C",
    });
  }
  channelReady = true;
}

export interface PermissionOutcome {
  granted: boolean;
  token: string | null;
}

// Permission flow → Expo push token ("ExponentPushToken[...]").
export async function requestPushPermissionAndGetToken(): Promise<PermissionOutcome> {
  await ensureAndroidChannel();

  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted;
  if (!granted) {
    const asked = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    granted = asked.granted;
  }
  if (!granted) return { granted: false, token: null };

  // Android emulators frequently lack Google services; treat missing-project /
  // simulator failures as "no token" instead of an error.
  if (!Device.isDevice) {
    return { granted: true, token: null };
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas.projectId as string | undefined;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return { granted: true, token: tokenResponse.data };
  } catch {
    return { granted: true, token: null };
  }
}

/**
 * Registers the device with the backend when the user opted in.
 * `register` performs the POST /me/push-tokens call (pushApi), keeping this
 * module free of AuthContext imports (AuthContext owns the caller side).
 */
export async function autoRegisterPush(
  register: (token: string) => Promise<unknown>,
): Promise<string | null> {
  const { granted, token } = await requestPushPermissionAndGetToken();
  if (!granted || !token) return null;
  const previous = await getPushToken();
  if (previous !== token) {
    await register(token);
    await setPushToken(token);
  }
  return token;
}

/** Removes the stored token and clears it locally. */
export async function unregisterPushToken(): Promise<void> {
  await setPushToken(null);
}

/**
 * Deep-link: tapping a notification lands on the Bildirimler tab.
 * navigationRef is shared with RootNavigator. Listener lives for the
 * mounting component's lifetime.
 */
export function usePushResponseHandler(): void {
  useEffect(() => {
    const responseListener = Notifications.addNotificationResponseReceivedListener(() => {
      navigateToNotifications();
    });
    return () => responseListener.remove();
  }, []);
}

let initialNotificationHandled = false;

/** Handles cold-start taps (notification opened the app). */
export async function handleInitialNotification(): Promise<void> {
  if (initialNotificationHandled) return;
  initialNotificationHandled = true;
  const response = await Notifications.getLastNotificationResponseAsync();
  if (response) navigateToNotifications();
}

function navigateToNotifications(): void {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate("Notifications");
}
