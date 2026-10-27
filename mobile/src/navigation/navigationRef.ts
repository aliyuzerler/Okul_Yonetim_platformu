// Shared navigation ref so non-React modules (push handlers) can navigate.
import { createNavigationContainerRef } from "@react-navigation/native";

export type TabParamList = {
  ParentHome: undefined;
  StudentHome: undefined;
  Timetable: undefined; // student tab
  Notifications: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Tabs: undefined;
  Login: undefined;
  Interstitial: undefined;
  Denied: undefined;
  ChildDetail: { childId: string };
  StudentAttendance: undefined;
  StudentMarks: undefined;
  StudentTimetable: undefined;
};

export const navigationRef = createNavigationContainerRef<
  RootStackParamList & TabParamList
>();
