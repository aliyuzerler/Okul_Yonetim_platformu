// NotificationsScreen — unread / read / archived boxes, infinite pagination,
// read & archive mutations, category + priority badges.
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  notificationsApi,
  type InboxBox,
} from "../api";
import type { MyNotification } from "../api/types";
import { NotificationBadges, Card } from "../components/portal";
import { ErrorNote, LoadingView, Screen } from "../components/Screen";
import { useI18n } from "../i18n/I18nContext";
import { palette, radius, spacing } from "../theme/tokens";

const PAGE_SIZE = 20;

export default function NotificationsScreen() {
  const { t, formatDate } = useI18n();
  const queryClient = useQueryClient();
  const [box, setBox] = useState<InboxBox>("unread");

  const inboxQuery = useInfiniteQuery({
    queryKey: ["notifications", "inbox", box],
    queryFn: ({ pageParam }) => notificationsApi.inbox(box, PAGE_SIZE, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const next = lastPage.offset + lastPage.items.length;
      return next < lastPage.total ? next : undefined;
    },
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: invalidate,
  });
  const archive = useMutation({
    mutationFn: async (input: { id: string; archived: boolean }) =>
      input.archived ? notificationsApi.unarchive(input.id) : notificationsApi.archive(input.id),
    onSuccess: invalidate,
  });
  const markAllRead = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: invalidate,
  });

  const items = useMemo(
    () => inboxQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [inboxQuery.data],
  );
  const counts = inboxQuery.data?.pages[0]?.counts;

  const boxes: Array<{ key: InboxBox; label: string; empty: string }> = [
    { key: "unread", label: t("notifications.box.unread"), empty: t("notifications.empty.unread") },
    { key: "read", label: t("notifications.box.read"), empty: t("notifications.empty.read") },
    { key: "archived", label: t("notifications.box.archived"), empty: t("notifications.empty.archived") },
  ];

  return (
    <Screen title={t("notifications.title")}>
      <View style={styles.boxRow}>
        {boxes.map((b) => (
          <Pressable
            key={b.key}
            onPress={() => setBox(b.key)}
            style={[styles.boxChip, box === b.key ? styles.boxChipActive : null]}
            accessibilityRole="button"
            accessibilityState={{ selected: box === b.key }}
          >
            <Text style={[styles.boxChipText, box === b.key ? styles.boxChipTextActive : null]}>
              {b.label}
              {counts ? ` (${counts[b.key]})` : ""}
            </Text>
          </Pressable>
        ))}
      </View>

      {box === "unread" && items.length > 0 ? (
        <Pressable onPress={() => markAllRead.mutate()} style={styles.markAll}>
          <Text style={styles.markAllText}>{t("notifications.markAllRead")}</Text>
        </Pressable>
      ) : null}

      {inboxQuery.isError ? (
        <ErrorNote message={t("common.error")} onRetry={() => void inboxQuery.refetch()} />
      ) : inboxQuery.isPending ? (
        <LoadingView />
      ) : items.length === 0 ? (
        <Card>
          <Text style={styles.muted}>{boxes.find((b) => b.key === box)?.empty}</Text>
        </Card>
      ) : (
        <>
          {items.map((item) => (
            <NotificationRow
              key={`${item.recipient_id}:${item.notification_id}`}
              item={item}
              box={box}
              busy={markRead.isPending || archive.isPending}
              onMarkRead={() => markRead.mutate(item.notification_id)}
              onToggleArchive={() => archive.mutate({ id: item.notification_id, archived: item.is_archived })}
            />
          ))}
          {inboxQuery.hasNextPage ? (
            <Pressable
              onPress={() => void inboxQuery.fetchNextPage()}
              style={styles.loadMore}
              disabled={inboxQuery.isFetchingNextPage}
            >
              {inboxQuery.isFetchingNextPage ? (
                <ActivityIndicator color={palette.accent} />
              ) : (
                <Text style={styles.loadMoreText}>{t("notifications.loadMore")}</Text>
              )}
            </Pressable>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function NotificationRow({
  item,
  box,
  busy,
  onMarkRead,
  onToggleArchive,
}: {
  item: MyNotification;
  box: InboxBox;
  busy: boolean;
  onMarkRead: () => void;
  onToggleArchive: () => void;
}) {
  const { t, formatDate } = useI18n();
  return (
    <Card style={item.is_read || box !== "unread" ? styles.rowRead : undefined}>
      <View style={styles.rowHeader}>
        <Text style={styles.title}>{item.title}</Text>
        {item.sent_at ? (
          <Text style={styles.date}>{formatDate(item.sent_at, "short")}</Text>
        ) : null}
      </View>
      <NotificationBadges category={item.category} priority={item.priority} />
      <Text style={styles.message}>{item.message}</Text>
      <Text style={styles.sender}>
        {t("notifications.sender")}: {item.sender_name || "—"}
      </Text>
      <View style={styles.actions}>
        {box === "unread" ? (
          <Action label={t("notifications.markRead")} onPress={onMarkRead} disabled={busy} />
        ) : null}
        <Action
          label={item.is_archived ? t("notifications.unarchive") : t("notifications.archive")}
          onPress={onToggleArchive}
          disabled={busy}
        />
      </View>
    </Card>
  );
}

function Action({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.action, (pressed || disabled) && styles.actionPressed]}
      accessibilityRole="button"
    >
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boxRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.s,
    marginBottom: spacing.m,
  },
  boxChip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderStrong,
    paddingHorizontal: spacing.m,
    paddingVertical: 6,
    backgroundColor: palette.layer,
  },
  boxChipActive: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  boxChipText: {
    color: palette.textPrimary,
    fontSize: 13,
  },
  boxChipTextActive: {
    color: palette.textOnColor,
    fontWeight: "700",
  },
  markAll: {
    alignSelf: "flex-end",
    marginBottom: spacing.m,
  },
  markAllText: {
    color: palette.accent,
    fontWeight: "600",
    fontSize: 13,
  },
  rowRead: {
    opacity: 0.75,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.s,
  },
  title: {
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    flexShrink: 1,
  },
  date: {
    color: palette.textTertiary,
    fontSize: 12,
  },
  message: {
    color: palette.textPrimary,
    fontSize: 14,
  },
  sender: {
    color: palette.textTertiary,
    fontSize: 12,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.s,
    flexWrap: "wrap",
  },
  action: {
    borderRadius: radius.s,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderStrong,
    paddingHorizontal: spacing.m,
    paddingVertical: 6,
    backgroundColor: palette.layerHover,
  },
  actionPressed: {
    opacity: 0.6,
  },
  actionText: {
    color: palette.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  loadMore: {
    alignItems: "center",
    padding: spacing.m,
  },
  loadMoreText: {
    color: palette.accent,
    fontWeight: "600",
  },
  muted: {
    color: palette.textTertiary,
  },
});
