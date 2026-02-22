import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { registerPushToken } from "../api/notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function getTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
  } catch {
    return "America/New_York";
  }
}

/**
 * Registers for push notifications and stores the token on the backend.
 * Call inside a component that has access to the authenticated userId.
 *
 * @param {string|null} userId - The Supabase auth user id
 */
export default function useNotifications(userId) {
  const tokenRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function setup() {
      if (!Device.isDevice) {
        console.log("[Notifications] Must use a physical device for push notifications");
        return;
      }

      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;

      if (existing !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("[Notifications] Permission not granted");
        return;
      }

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF8F4C",
        });
      }

      try {
        const pushToken = await Notifications.getExpoPushTokenAsync({
          projectId: undefined, // uses the project id from app.json automatically
        });

        if (cancelled) return;

        const token = pushToken.data;
        tokenRef.current = token;

        const result = await registerPushToken({
          userId,
          token,
          timezone: getTimezone(),
        });

        if (!result.ok) {
          console.warn("[Notifications] Token registration failed:", result.error);
        }
      } catch (err) {
        console.warn("[Notifications] Failed to get push token:", err);
      }
    }

    setup();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Listen for incoming notifications while app is foregrounded
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      console.log("[Notifications] Received:", notification.request.content);
    });
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("[Notifications] Tapped:", response.notification.request.content);
    });

    return () => {
      sub.remove();
      responseSub.remove();
    };
  }, []);
}
