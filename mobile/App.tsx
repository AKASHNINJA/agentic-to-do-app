import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { parseBrainDump } from "./lib/agent";
import { MomentumPlanet } from "./components/MomentumPlanet";
import { TaskCard } from "./components/TaskCard";
import { useOrbitStore } from "./store/useOrbitStore";

export default function App() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { tasks, momentumScore, addTasks, completeTask, snoozeTask } = useOrbitStore();

  const onParse = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const parsed = await parseBrainDump(input);
      addTasks(
        parsed.tasks.map((task) => ({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title: task.title,
          vibeTags: task.vibeTags,
          dueAt: task.dueAt,
          status: "todo" as const,
        }))
      );
      setInput("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView style={styles.screen}>
      <View style={styles.backgroundLayer} />
      <View style={styles.middleLayer}>
        <Text style={styles.header}>Orbit</Text>
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onComplete={() => completeTask(task.id)}
            onSnooze={() => snoozeTask(task.id)}
          />
        ))}
      </View>

      <View style={styles.foregroundLayer}>
        <MomentumPlanet score={momentumScore} />
        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Dump a thought..."
            placeholderTextColor="#99A5C0"
            style={styles.input}
          />
          <Pressable style={styles.button} onPress={onParse}>
            <Text style={styles.buttonText}>{loading ? "..." : "Send"}</Text>
          </Pressable>
        </View>
      </View>

      <StatusBar style="light" />
    </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#060B1A" },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0A1330",
  },
  middleLayer: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  foregroundLayer: {
    alignItems: "center",
    paddingBottom: 20,
    gap: 12,
  },
  header: { color: "#DDF5FF", fontSize: 34, fontWeight: "800", marginBottom: 10 },
  inputBar: {
    width: "94%",
    flexDirection: "row",
    backgroundColor: "rgba(20, 33, 66, 0.95)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(157,255,87,0.28)",
    padding: 8,
  },
  input: { flex: 1, color: "white", paddingHorizontal: 10 },
  button: {
    backgroundColor: "#9DFF57",
    borderRadius: 12,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  buttonText: { color: "#0A1330", fontWeight: "700" },
});
