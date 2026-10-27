// RootNavigator — role-based tabs (parent: Home/Notifications/Profile,
// student: Home/Timetable/Notifications/Profile), unread tab badge via a
// 2-minute polling query, student stack screens and the shared navigationRef.
import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

import { notificationsApi } from "../api";
import { useAuth } from "../auth/AuthContext";
import { palette } from "../theme/tokens";
import { useI18n } from "../i18n/I18nContext";
import {
  navigationRef,
  type RootStackParamList,
  type TabParamList,
} from "./navigationRef";
import {
  handleInitialNotification,
  usePushResponseHandler,
} from "../push/notifications";
import AccessDeniedScreen from "../screens/AccessDeniedScreen";
import ChildDetailScreen from "../screens/ChildDetailScreen";
import HomeScreen from "../screens/HomeScreen";
import LoginScreen from "../screens/LoginScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import PasswordInterstitialScreen from "../screens/PasswordInterstitialScreen";
import ProfileScreen from "../screens/ProfileScreen";
import StudentAttendanceScreen from "../screens/StudentAttendanceScreen";
import StudentHomeScreen from "../screens/StudentHomeScreen";
import StudentMarksScreen from "../screens/StudentMarksScreen";
import StudentTimetableScreen from "../screens/StudentTimetableScreen";
import { LoadingView } from "../components/Screen";

const Tab = createBottomTabNavigator<TabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

function UnreadBadge() {
  // 2-minute polling — push may be unavailable; the tab badge stays honest.
  const { data } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 120_000,
  });
  const count = data?.unread_count ?? 0;
  if (count <= 0) return null;
  return (
    <Text style={styles.badge}>{count > 99 ? "99+" : count}</Text>
  );
}

function ParentTabs() {
  const { t } = useI18n();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.textDisabled,
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            ParentHome: "home",
            Notifications: "notifications",
            Profile: "person",
          };
          return <Ionicons name={icons[route.name] ?? "ellipse"} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="ParentHome" component={HomeScreen} options={{ title: t("tabs.home") }} />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: t("tabs.notifications"),
          tabBarBadge: undefined,
          tabBarLabel: () => <TabLabelWithBadge label={t("tabs.notifications")} />,
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: t("tabs.profile") }} />
    </Tab.Navigator>
  );
}

function StudentTabs() {
  const { t } = useI18n();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.textDisabled,
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            StudentHome: "home",
            Timetable: "calendar",
            Notifications: "notifications",
            Profile: "person",
          };
          return <Ionicons name={icons[route.name] ?? "ellipse"} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="StudentHome" component={StudentHomeScreen} options={{ title: t("tabs.home") }} />
      <Tab.Screen
        name="Timetable"
        component={StudentTimetableScreen}
        options={{ title: t("tabs.timetable") }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: t("tabs.notifications"), tabBarLabel: () => <TabLabelWithBadge label={t("tabs.notifications")} /> }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: t("tabs.profile") }} />
    </Tab.Navigator>
  );
}

function TabLabelWithBadge({ label }: { label: string }) {
  return (
    <View style={styles.labelWrap}>
      <Text style={styles.labelText}>{label}</Text>
      <UnreadBadge />
    </View>
  );
}

function AuthedShell() {
  const { isStudent, status } = useAuth();

  // One navigator regardless of auth state so navigationRef is always bound.
  if (status === "anonymous") {
    return (
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Login" component={LoginScreen} />
      </RootStack.Navigator>
    );
  }
  if (status === "interstitial") {
    return (
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Interstitial" component={PasswordInterstitialScreen} />
      </RootStack.Navigator>
    );
  }
  if (isStudent) {
    return (
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Tabs" component={StudentTabs} />
        <RootStack.Screen name="StudentAttendance" component={StudentAttendanceScreen} />
        <RootStack.Screen name="StudentMarks" component={StudentMarksScreen} />
        <RootStack.Screen name="StudentTimetable" component={StudentTimetableScreen} />
      </RootStack.Navigator>
    );
  }
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Tabs" component={ParentTabs} />
      <RootStack.Screen name="ChildDetail" component={ChildDetailScreen} />
      <RootStack.Screen name="StudentAttendance" component={StudentAttendanceScreen} />
      <RootStack.Screen name="StudentMarks" component={StudentMarksScreen} />
      <RootStack.Screen name="StudentTimetable" component={StudentTimetableScreen} />
    </RootStack.Navigator>
  );
}

export default function RootNavigator() {
  const { status, isStudent, isParent } = useAuth();

  // Notification tap → Bildirimler sekmesi (navigationRef based).
  usePushResponseHandler();
  useEffect(() => {
    void handleInitialNotification();
  }, []);

  if (status === "loading") return <LoadingView />;

  return (
    <NavigationContainer ref={navigationRef}>
      {isStudent || isParent ? (
        <AuthedShell />
      ) : (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {status === "anonymous" ? (
            <RootStack.Screen name="Login" component={LoginScreen} />
          ) : status === "interstitial" ? (
            <RootStack.Screen name="Interstitial" component={PasswordInterstitialScreen} />
          ) : (
            <RootStack.Screen name="Denied" component={AccessDeniedScreen} />
          )}
        </RootStack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: palette.danger,
    color: palette.textOnColor,
    fontSize: 10,
    fontWeight: "700",
    borderRadius: 9,
    minWidth: 18,
    paddingHorizontal: 4,
    paddingVertical: 1,
    textAlign: "center",
    overflow: "hidden",
    marginLeft: 4,
  },
  labelWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  labelText: {
    fontSize: 10,
  },
});
