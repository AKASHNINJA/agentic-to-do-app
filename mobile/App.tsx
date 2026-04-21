import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { parseBrainDump } from "./lib/agent";
import { fetchGoogleCalendarPreview } from "./lib/calendar";
import { CompletionBurst } from "./components/CompletionBurst";
import { MomentumPlanet } from "./components/MomentumPlanet";
import { TaskCard } from "./components/TaskCard";
import { useOrbitStore } from "./store/useOrbitStore";

export default function App() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);
  const [showMonth, setShowMonth] = useState(false);
  const [burstTrigger, setBurstTrigger] = useState(0);
  const [calendarStatus, setCalendarStatus] = useState("Calendar: not synced");
  const { tasks, momentumScore, addTasks, completeTask, snoozeTask } = useOrbitStore();
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [floatAnim]);

  const planetFloatStyle = {
    transform: [
      {
        translateY: floatAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -8],
        }),
      },
    ],
  };

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const offset = i - 3;
      const date = new Date();
      date.setDate(date.getDate() + offset);
      return {
        key: date.toISOString(),
        offset,
        short: date.toLocaleDateString("en-US", { weekday: "short" }),
        day: date.getDate(),
      };
    });
  }, []);

  const monthDays = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const count = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Array.from({ length: count }).map((_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const offset = Math.floor((date.getTime() - new Date().setHours(0, 0, 0, 0)) / (24 * 60 * 60 * 1000));
      const dotCount = tasks.filter((task) => task.dueAt && new Date(task.dueAt).toDateString() === date.toDateString()).length;
      return { key: date.toISOString(), date, offset, dotCount };
    });
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    const target = new Date();
    target.setDate(target.getDate() + selectedDayOffset);
    const targetKey = target.toDateString();
    const filtered = tasks.filter((task) => {
      if (!task.dueAt) return selectedDayOffset === 0;
      return new Date(task.dueAt).toDateString() === targetKey;
    });
    return filtered.length > 0 ? filtered : tasks.filter((task) => task.status === "todo");
  }, [selectedDayOffset, tasks]);

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
          dueAt:
            task.dueAt ??
            new Date(Date.now() + selectedDayOffset * 24 * 60 * 60 * 1000).toISOString(),
          status: "todo" as const,
        }))
      );
      setInput("");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = (id: string) => {
    completeTask(id);
    setBurstTrigger((v) => v + 1);
  };

  const loadCalendar = async () => {
    try {
      const result = await fetchGoogleCalendarPreview();
      setCalendarStatus(
        result.connected
          ? `Calendar: synced (${result.events.length} upcoming)`
          : "Calendar: connect required (preview mode)"
      );
      if (result.events.length > 0) {
        addTasks(
          result.events.map((event) => ({
            id: `gcal-${event.id}`,
            title: event.title,
            vibeTags: ["#calendar"],
            dueAt: event.startAt,
            status: "todo" as const,
          }))
        );
      }
    } catch {
      setCalendarStatus("Calendar: service unavailable");
    }
  };

  if (Platform.OS === "web") {
    return (
      <View style={[styles.screen, { padding: 16 }]}>
        <Text style={styles.header}>Orbit</Text>
        <View style={styles.modeRow}>
          <Pressable onPress={() => setShowMonth(false)} style={[styles.modeButton, !showMonth && styles.modeButtonActive]}>
            <Text style={styles.modeText}>Week</Text>
          </Pressable>
          <Pressable onPress={() => setShowMonth(true)} style={[styles.modeButton, showMonth && styles.modeButtonActive]}>
            <Text style={styles.modeText}>Month</Text>
          </Pressable>
          <Pressable onPress={loadCalendar} style={[styles.modeButton, { marginLeft: "auto" }]}>
            <Text style={styles.modeText}>Sync</Text>
          </Pressable>
        </View>
        <Text style={styles.calendarStatus}>{calendarStatus}</Text>
        {showMonth ? (
          <MonthGrid days={monthDays} selectedDayOffset={selectedDayOffset} setSelectedDayOffset={setSelectedDayOffset} />
        ) : (
        <CalendarRow
          weekDays={weekDays}
          selectedDayOffset={selectedDayOffset}
          setSelectedDayOffset={setSelectedDayOffset}
        />
        )}
        <Text style={styles.sectionTitle}>Today Queue</Text>
        {visibleTasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            onComplete={() => handleComplete(task.id)}
            onSnooze={() => snoozeTask(task.id)}
            depthIndex={index}
          />
        ))}
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
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView style={styles.screen}>
      <View style={styles.backgroundLayer} />
      <View style={styles.middleLayer}>
        <Text style={styles.header}>Orbit</Text>
        <View style={styles.modeRow}>
          <Pressable onPress={() => setShowMonth(false)} style={[styles.modeButton, !showMonth && styles.modeButtonActive]}>
            <Text style={styles.modeText}>Week</Text>
          </Pressable>
          <Pressable onPress={() => setShowMonth(true)} style={[styles.modeButton, showMonth && styles.modeButtonActive]}>
            <Text style={styles.modeText}>Month</Text>
          </Pressable>
          <Pressable onPress={loadCalendar} style={[styles.modeButton, { marginLeft: "auto" }]}>
            <Text style={styles.modeText}>Sync</Text>
          </Pressable>
        </View>
        <Text style={styles.calendarStatus}>{calendarStatus}</Text>
        {showMonth ? (
          <MonthGrid days={monthDays} selectedDayOffset={selectedDayOffset} setSelectedDayOffset={setSelectedDayOffset} />
        ) : (
        <CalendarRow
          weekDays={weekDays}
          selectedDayOffset={selectedDayOffset}
          setSelectedDayOffset={setSelectedDayOffset}
        />
        )}
        <Text style={styles.sectionTitle}>Today Queue</Text>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
          {visibleTasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={() => handleComplete(task.id)}
              onSnooze={() => snoozeTask(task.id)}
              depthIndex={index}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.foregroundLayer}>
        <Animated.View style={planetFloatStyle}>
          <MomentumPlanet score={momentumScore} />
          <CompletionBurst trigger={burstTrigger} />
        </Animated.View>
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
  sectionTitle: { color: "#9DB2D9", fontSize: 14, marginTop: 12, marginBottom: 8, letterSpacing: 0.4 },
  modeRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  modeButton: {
    borderWidth: 1,
    borderColor: "rgba(157,255,87,0.3)",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "rgba(14, 26, 53, 0.75)",
  },
  modeButtonActive: { backgroundColor: "rgba(157,255,87,0.18)", borderColor: "#9DFF57" },
  modeText: { color: "#DDF5FF", fontSize: 12, fontWeight: "700" },
  calendarStatus: { color: "#83A0C8", marginBottom: 10, fontSize: 12 },
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

type CalendarRowProps = {
  weekDays: { key: string; offset: number; short: string; day: number }[];
  selectedDayOffset: number;
  setSelectedDayOffset: (offset: number) => void;
};

function CalendarRow({ weekDays, selectedDayOffset, setSelectedDayOffset }: CalendarRowProps) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {weekDays.map((day) => {
        const selected = selectedDayOffset === day.offset;
        return (
          <Pressable
            key={day.key}
            onPress={() => setSelectedDayOffset(day.offset)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: selected ? "#9DFF57" : "rgba(157,255,87,0.2)",
              backgroundColor: selected ? "rgba(157,255,87,0.14)" : "rgba(14, 26, 53, 0.75)",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#BFD4FF", fontSize: 11 }}>{day.short}</Text>
            <Text style={{ color: "white", fontWeight: "700" }}>{day.day}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type MonthGridProps = {
  days: { key: string; date: Date; offset: number; dotCount: number }[];
  selectedDayOffset: number;
  setSelectedDayOffset: (offset: number) => void;
};

function MonthGrid({ days, selectedDayOffset, setSelectedDayOffset }: MonthGridProps) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {days.map((item) => {
        const selected = item.offset === selectedDayOffset;
        return (
          <Pressable
            key={item.key}
            onPress={() => setSelectedDayOffset(item.offset)}
            style={{
              width: "12.8%",
              minWidth: 38,
              borderRadius: 10,
              paddingVertical: 6,
              alignItems: "center",
              backgroundColor: selected ? "rgba(157,255,87,0.2)" : "rgba(14, 26, 53, 0.75)",
              borderWidth: 1,
              borderColor: selected ? "#9DFF57" : "rgba(157,255,87,0.15)",
            }}
          >
            <Text style={{ color: "#DDF5FF", fontSize: 12 }}>{item.date.getDate()}</Text>
            {item.dotCount > 0 && (
              <View style={{ marginTop: 3, width: 6, height: 6, borderRadius: 3, backgroundColor: "#9DFF57" }} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
