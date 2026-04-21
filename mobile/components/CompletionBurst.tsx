import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

type CompletionBurstProps = {
  trigger: number;
};

export function CompletionBurst({ trigger }: CompletionBurstProps) {
  const particles = useRef(
    Array.from({ length: 10 }).map(() => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.4),
    }))
  ).current;

  useEffect(() => {
    particles.forEach((p, i) => {
      const angle = (Math.PI * 2 * i) / particles.length;
      const distance = 42 + i * 3;
      p.x.setValue(0);
      p.y.setValue(0);
      p.opacity.setValue(0.9);
      p.scale.setValue(0.4);

      Animated.parallel([
        Animated.timing(p.x, { toValue: Math.cos(angle) * distance, duration: 480, useNativeDriver: true }),
        Animated.timing(p.y, { toValue: Math.sin(angle) * distance, duration: 480, useNativeDriver: true }),
        Animated.timing(p.opacity, { toValue: 0, duration: 520, useNativeDriver: true }),
        Animated.timing(p.scale, { toValue: 1.1, duration: 480, useNativeDriver: true }),
      ]).start();
    });
  }, [particles, trigger]);

  return (
    <View pointerEvents="none" style={{ position: "absolute", width: 120, height: 120, alignItems: "center", justifyContent: "center" }}>
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: i % 2 === 0 ? "#9DFF57" : "#8CD8FF",
            opacity: p.opacity,
            transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
          }}
        />
      ))}
    </View>
  );
}
