import * as Haptics from "expo-haptics";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Reanimated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import type { OrbitTask } from "../store/useOrbitStore";
import { MOTION } from "../constants/motion";
import { THEME } from "../constants/theme";

const C = THEME.colors;

type TaskCardProps = {
  task: OrbitTask;
  onComplete: () => void;
  onSnooze: () => void;
  onDelete: () => void;
  onSetStatus: (status: string) => void;
  statuses: string[];
  depthIndex?: number;
};

export function TaskCard({
  task,
  onComplete,
  onSnooze,
  onDelete,
  onSetStatus,
  statuses,
  depthIndex: _depthIndex = 0,
}: TaskCardProps) {
  const tx = useSharedValue(0);

  const handleComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
  };
  const handleSnooze = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSnooze();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      tx.value = event.translationX;
    })
    .onEnd(() => {
      if (tx.value > 90) runOnJS(handleComplete)();
      else if (tx.value < -90) runOnJS(handleSnooze)();
      tx.value = withSpring(0, MOTION.spring);
    });

  const isCompleted = task.status === "Completed";

  const cardBody = (
    <View style={[styles.card, isCompleted && styles.cardCompleted]}>
      <View style={styles.topRow}>
        <View style={styles.titleRow}>
          <Pressable
            onPress={handleComplete}
            style={[styles.checkbox, isCompleted && styles.checkboxDone]}
            accessibilityLabel={isCompleted ? "Mark not done" : "Mark done"}
          >
            {isCompleted ? <Text style={styles.checkboxDoneMark}>✓</Text> : null}
          </Pressable>
          <Text style={[styles.title, isCompleted && styles.titleCompleted]} numberOfLines={2}>
            {task.title}
          </Text>
        </View>
        {task.dueAt ? (
          <View style={styles.dueChip}>
            <Text style={styles.dueChipText}>{formatDueDate(task.dueAt)}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.metaRow}>
        <View style={styles.statusChips}>
          {statuses.map((status) => {
            const selected = task.status === status;
            return (
              <Pressable
                key={status}
                onPress={() => onSetStatus(status)}
                style={[styles.statusChip, selected && styles.statusChipActive]}
              >
                <Text style={[styles.statusChipText, selected && styles.statusChipTextActive]}>
                  {status}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.actions}>
          <Pressable onPress={handleSnooze} style={styles.actionButton}>
            <Text style={styles.actionText}>Snooze</Text>
          </Pressable>
          <Pressable onPress={onDelete} style={[styles.actionButton, styles.actionButtonDanger]}>
            <Text style={[styles.actionText, styles.actionTextDanger]}>Delete</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  if (Platform.OS === "web") return cardBody;

  return (
    <GestureDetector gesture={pan}>
      <Reanimated.View style={animatedStyle}>{cardBody}</Reanimated.View>
    </GestureDetector>
  );
}

function formatDueDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const diffDays = Math.round((day.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  let dayLabel: string;
  if (diffDays === 0) dayLabel = "Today";
  else if (diffDays === 1) dayLabel = "Tomorrow";
  else if (diffDays === -1) dayLabel = "Yesterday";
  else if (diffDays > 1 && diffDays < 7) dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
  else dayLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  if (hasTime) {
    const timeLabel = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `${dayLabel} · ${timeLabel}`;
  }
  return dayLabel;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 10,
  },
  cardCompleted: {
    backgroundColor: C.surfaceMuted,
    borderColor: C.border,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: C.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surface,
  },
  checkboxDone: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  checkboxDoneMark: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 15,
  },
  title: {
    flex: 1,
    color: C.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  titleCompleted: {
    color: C.textMuted,
    textDecorationLine: "line-through",
  },
  dueChip: {
    backgroundColor: C.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  dueChipText: {
    color: C.accentStrong,
    fontSize: 11,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  statusChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  statusChipActive: {
    backgroundColor: C.accentSoft,
    borderColor: C.accent,
  },
  statusChipText: {
    color: C.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  statusChipTextActive: {
    color: C.accentStrong,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: 6,
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  actionButtonDanger: {
    borderColor: C.dangerSoft,
    backgroundColor: C.dangerSoft,
  },
  actionText: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  actionTextDanger: {
    color: C.danger,
    fontWeight: "700",
  },
});
