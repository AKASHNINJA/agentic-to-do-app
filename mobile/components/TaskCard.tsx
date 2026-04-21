import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Animated as RNAnimated } from "react-native";
import Reanimated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import type { OrbitTask } from "../store/useOrbitStore";
import { MOTION } from "../constants/motion";

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
  depthIndex = 0,
}: TaskCardProps) {
  const tx = useSharedValue(0);
  const intro = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.spring(intro, {
      toValue: 1,
      delay: depthIndex * 60,
      damping: MOTION.spring.damping,
      stiffness: MOTION.spring.stiffness,
      mass: MOTION.spring.mass,
      useNativeDriver: true,
    }).start();
  }, [depthIndex, intro]);
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
      if (tx.value > 90) {
        runOnJS(handleComplete)();
      } else if (tx.value < -90) {
        runOnJS(handleSnooze)();
      }
      tx.value = withSpring(0, MOTION.spring);
    });

  const cardBody = (
    <RNAnimated.View
      style={{
        backgroundColor: "#10162D",
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        transform: [
          { perspective: 900 },
          { rotateX: `${Math.max(0, 5 - depthIndex * 0.9)}deg` },
          { rotateY: `${Math.max(0, 2 - depthIndex * 0.3)}deg` },
          {
            translateY: intro.interpolate({
              inputRange: [0, 1],
              outputRange: [28, 0],
            }),
          },
          {
            scale: intro.interpolate({
              inputRange: [0, 1],
              outputRange: [0.94, 1],
            }),
          },
        ],
        opacity: intro,
        borderWidth: task.status === "Completed" ? 0 : 1,
        borderColor: "rgba(0,229,255,0.45)",
        shadowColor: "#00E5FF",
        shadowOpacity: Math.max(0.1, 0.22 - depthIndex * 0.02),
        shadowRadius: Math.max(4, 12 - depthIndex),
        shadowOffset: { width: 0, height: 7 - Math.min(depthIndex, 5) },
      }}
    >
      <Text style={{ color: "#ECF6FF", fontSize: 16, fontWeight: "700" }}>{task.title}</Text>
      <View style={{ flexDirection: "row", marginTop: 6 }}>
        {task.vibeTags.map((tag) => (
          <View
            key={tag}
            style={{
              backgroundColor: "rgba(255,43,214,0.15)",
              borderColor: "rgba(255,43,214,0.55)",
              borderWidth: 1,
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 2,
              marginRight: 8,
            }}
          >
            <Text style={{ color: "#F8C8FF", fontSize: 12 }}>{formatVibeTag(tag)}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
        <Pressable
          onPress={handleComplete}
          style={{ backgroundColor: "rgba(0,229,255,0.15)", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 }}
        >
          <Text style={{ color: "#8FF3FF", fontWeight: "700" }}>Complete</Text>
        </Pressable>
        <Pressable
          onPress={handleSnooze}
          style={{ backgroundColor: "rgba(255,43,214,0.16)", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 }}
        >
          <Text style={{ color: "#FFC0F2", fontWeight: "700" }}>Snooze</Text>
        </Pressable>
        <Pressable
          onPress={onDelete}
          style={{ backgroundColor: "rgba(255,85,85,0.2)", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 }}
        >
          <Text style={{ color: "#FFB8B8", fontWeight: "700" }}>Delete</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
        {statuses.map((status) => {
          const selected = task.status === status;
          return (
            <Pressable
              key={status}
              onPress={() => onSetStatus(status)}
              style={{
                borderWidth: 1,
                borderColor: selected ? "#00E5FF" : "rgba(146,168,204,0.35)",
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 3,
                backgroundColor: selected ? "rgba(0,229,255,0.2)" : "rgba(12,18,40,0.8)",
              }}
            >
              <Text style={{ color: selected ? "#D5FAFF" : "#92A8CC", fontSize: 11 }}>{status}</Text>
            </Pressable>
          );
        })}
      </View>
    </RNAnimated.View>
  );

  if (Platform.OS === "web") return cardBody;

  return (
    <GestureDetector gesture={pan}>
      <Reanimated.View style={animatedStyle}>{cardBody}</Reanimated.View>
    </GestureDetector>
  );
}

function formatVibeTag(tag: string): string {
  const clean = tag.replace("#", "").toLowerCase();
  const map: Record<string, string> = {
    grind: "Deep Focus",
    chill: "Easy Win",
    errand: "Errand",
    deep: "High Energy",
    someday: "Someday",
    ugh: "Quick Fix",
    calendar: "Calendar",
  };
  return map[clean] ?? clean.charAt(0).toUpperCase() + clean.slice(1);
}
