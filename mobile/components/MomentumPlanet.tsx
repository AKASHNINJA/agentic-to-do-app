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
          backgroundColor: "#9DFF57",
          shadowColor: "#9DFF57",
          shadowOpacity: 0.35,
          shadowRadius: 20,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: "rgba(255,255,255,0.5)",
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
          <Circle cx={60} cy={60} r={radius + 12} color="rgba(160,255,70,0.2)" />
          <Circle cx={60} cy={60} r={radius} color="#9DFF57" />
          <Circle cx={35} cy={38} r={4} color="rgba(255,255,255,0.6)" />
        </Group>
      </Canvas>
    </View>
  );
}
