import { Canvas, Circle, Group } from "@shopify/react-native-skia";
import { Platform, View } from "react-native";

type MomentumPlanetProps = {
  score: number;
};

export function MomentumPlanet({ score }: MomentumPlanetProps) {
  const size = 120;
  const radius = 26 + score * 0.2;

  if (Platform.OS === "web") {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "#00E5FF",
          shadowColor: "#00E5FF",
          shadowOpacity: 0.45,
          shadowRadius: 24,
          justifyContent: "center",
          alignItems: "center",
          borderWidth: 2,
          borderColor: "rgba(255,43,214,0.7)",
        }}
      >
        <View
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: "rgba(255,255,255,0.75)",
            transform: [{ translateX: -20 }, { translateY: -14 }],
          }}
        />
      </View>
    );
  }

  return (
    <View>
      <Canvas style={{ width: size, height: size }}>
        <Group>
          <Circle cx={60} cy={60} r={radius + 14} color="rgba(0,229,255,0.2)" />
          <Circle cx={60} cy={60} r={radius + 5} color="rgba(255,43,214,0.25)" />
          <Circle cx={60} cy={60} r={radius} color="#00E5FF" />
          <Circle cx={35} cy={38} r={4} color="rgba(255,255,255,0.85)" />
        </Group>
      </Canvas>
    </View>
  );
}
