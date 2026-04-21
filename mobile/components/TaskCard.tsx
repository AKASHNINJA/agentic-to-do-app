import * as Haptics from "expo-haptics";
import { Platform, Pressable, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import type { OrbitTask } from "../store/useOrbitStore";
import { MOTION } from "../constants/motion";

type TaskCardProps = {
  task: OrbitTask;
  onComplete: () => void;
  onSnooze: () => void;
  depthIndex?: number;
};

export function TaskCard({ task, onComplete, onSnooze, depthIndex = 0 }: TaskCardProps) {
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
      if (tx.value > 90) {
        runOnJS(handleComplete)();
      } else if (tx.value < -90) {
        runOnJS(handleSnooze)();
      }
      tx.value = withSpring(0, MOTION.spring);
    });

  const cardBody = (
    <View
      style={{
        backgroundColor: "rgba(17, 30, 60, 0.9)",
        borderRadius: 18,
        padding: 14,
        marginBottom: 10,
        transform: [{ perspective: 900 }, { rotateX: `${Math.max(0, 6 - depthIndex * 1.2)}deg` }],
        borderWidth: task.status === "done" ? 0 : 1,
        borderColor: "rgba(157,255,87,0.35)",
        shadowColor: "#9DFF57",
        shadowOpacity: Math.max(0.08, 0.2 - depthIndex * 0.03),
        shadowRadius: Math.max(4, 14 - depthIndex),
        shadowOffset: { width: 0, height: 8 - Math.min(depthIndex, 6) },
      }}
    >
      <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>{task.title}</Text>
      <View style={{ flexDirection: "row", marginTop: 6 }}>
        {task.vibeTags.map((tag) => (
          <Text key={tag} style={{ color: "#9DFF57", marginRight: 8 }}>
            {tag}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
        <Pressable
          onPress={handleComplete}
          style={{ backgroundColor: "#123B1E", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 }}
        >
          <Text style={{ color: "#9DFF57", fontWeight: "700" }}>Complete</Text>
        </Pressable>
        <Pressable
          onPress={handleSnooze}
          style={{ backgroundColor: "#2D2A18", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 }}
        >
          <Text style={{ color: "#F5CE73", fontWeight: "700" }}>Snooze</Text>
        </Pressable>
      </View>
    </View>
  );

  if (Platform.OS === "web") return cardBody;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={animatedStyle}>{cardBody}</Animated.View>
    </GestureDetector>
  );
}
