// Parent home: one ChildCard per linked child — this month's attendance rate
// plus the latest term average (GET /me/children + /me/children/summary).
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Text } from "react-native";

import { guardianApi } from "../api";
import { ChildCard, Card } from "../components/portal";
import { ErrorNote, LoadingView, Screen } from "../components/Screen";
import { useI18n } from "../i18n/I18nContext";
import type { RootStackParamList } from "../navigation/navigationRef";
import { spacing } from "../theme/tokens";

export default function HomeScreen() {
  const { t } = useI18n();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const childrenQuery = useQuery({
    queryKey: ["parent", "children"],
    queryFn: guardianApi.children,
  });

  const summaryQuery = useQuery({
    queryKey: ["parent", "children-summary"],
    queryFn: guardianApi.childrenSummary,
  });

  const children = childrenQuery.data;
  const summaries = summaryQuery.data;
  const summaryById = new Map((summaries ?? []).map((s) => [s.student_id, s]));

  if (childrenQuery.isLoading || summaryQuery.isLoading) return <LoadingView />;

  return (
    <Screen title={t("home.title")}>
      <Text style={{ marginBottom: spacing.m, color: "#525252" }}>{t("home.subtitle")}</Text>
      {childrenQuery.isError ? (
        <ErrorNote
          message={t("common.error")}
          onRetry={() => {
            void childrenQuery.refetch();
          }}
        />
      ) : null}
      {children && children.length > 0 ? (
        children.map((child) => (
          <ChildCard
            key={child.id}
            child={child}
            summary={summaryById.get(child.id)}
            onPress={() => navigation.navigate("ChildDetail", { childId: child.id })}
          />
        ))
      ) : !childrenQuery.isError ? (
        <Card>
          <Text>{t("error.noChildren")}</Text>
        </Card>
      ) : null}
    </Screen>
  );
}
