import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Text, View } from "react-native";
import { MOTION } from "../constants/motion";
import type { OrbitTask } from "../store/useOrbitStore";

type TaskCardProps = {
  task: OrbitTask;
  onComplete: () => void;
  onSnooze: () => void;
};

export function TaskCard({ task, onComplete, onSnooze }: TaskCardProps) {
  const x = useSharedValue(0);
  const notifyComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
  };
  const notifySnooze = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSnooze();
  };

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      x.value = event.translationX;
    })
    .onEnd(() => {
      if (x.value > 80) {
        runOnJS(notifyComplete)();
      } else if (x.value < -80) {
        runOnJS(notifySnooze)();
      }
      x.value = withSpring(0, MOTION.spring);
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          {
            backgroundColor: "rgba(17, 30, 60, 0.9)",
            borderRadius: 18,
            padding: 14,
            marginBottom: 10,
            borderWidth: task.status === "done" ? 0 : 1,
            borderColor: "rgba(157,255,87,0.35)",
          },
          style,
        ]}
      >
        <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>{task.title}</Text>
        <View style={{ flexDirection: "row", marginTop: 6 }}>
          {task.vibeTags.map((tag) => (
            <Text key={tag} style={{ color: "#9DFF57", marginRight: 8 }}>
              {tag}
            </Text>
          ))}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
