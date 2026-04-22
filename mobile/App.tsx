import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { parseBrainDump } from "./lib/agent";
import { connectGoogleCalendar, createGoogleCalendarEvent, fetchGoogleCalendarPreview } from "./lib/calendar";
import { CompletionBurst } from "./components/CompletionBurst";
import { MomentumPlanet } from "./components/MomentumPlanet";
import { TaskCard } from "./components/TaskCard";
import { MOTION } from "./constants/motion";
import { THEME } from "./constants/theme";
import { useOrbitStore } from "./store/useOrbitStore";

export default function App() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [parseStatus, setParseStatus] = useState("");
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);
  const [activeStatusTab, setActiveStatusTab] = useState("To Do");
  const [viewMode, setViewMode] = useState<"list" | "week" | "calendar">("list");
  const [burstTrigger, setBurstTrigger] = useState(0);
  const [calendarStatus, setCalendarStatus] = useState("Calendar: not synced");
  const [gcalConnected, setGcalConnected] = useState(false);
  const [showGcalOptions, setShowGcalOptions] = useState(false);
  const [autoCreateGcalEvents, setAutoCreateGcalEvents] = useState(true);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [pickedDate, setPickedDate] = useState<string>("");
  const {
    tasks,
    statuses,
    momentumScore,
    addTasks,
    completeTask,
    snoozeTask,
    deleteTask,
    updateTaskStatus,
  } = useOrbitStore();
  const floatAnim = useRef(new Animated.Value(0)).current;
  const driftAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: MOTION.sceneFloatMs, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: MOTION.sceneFloatMs, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [floatAnim]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(driftAnim, { toValue: 1, duration: MOTION.sceneDriftMs, useNativeDriver: true }),
        Animated.timing(driftAnim, { toValue: 0, duration: MOTION.sceneDriftMs, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [driftAnim]);

  useEffect(() => {
    const id = setInterval(() => {
      setQuoteIndex((idx) => (idx + 1) % MOTIVATIONAL_QUOTES.length);
    }, 7000);
    return () => clearInterval(id);
  }, []);

  const listParallaxStyle = {
    transform: [
      {
        translateY: scrollY.interpolate({
          inputRange: [0, 300],
          outputRange: [0, -MOTION.listParallaxMax],
          extrapolate: "clamp",
        }),
      },
    ],
  };
  const planetFloatStyle = {
    transform: [
      {
        translateY: Animated.add(
          floatAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -8],
          }),
          scrollY.interpolate({
            inputRange: [0, 300],
            outputRange: [0, MOTION.heroParallaxMax],
            extrapolate: "clamp",
          })
        ),
      },
      {
        scale: scrollY.interpolate({
          inputRange: [0, 300],
          outputRange: [1, MOTION.heroScaleMin],
          extrapolate: "clamp",
        }),
      },
    ],
  };
  const nebulaDriftStyle = {
    transform: [
      {
        translateX: driftAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 20] }),
      },
      {
        translateY: driftAnim.interpolate({ inputRange: [0, 1], outputRange: [10, -10] }),
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
      const dayTasks = tasks.filter((task) => task.dueAt && new Date(task.dueAt).toDateString() === date.toDateString());
      const contextSeed = dayTasks[0]?.title ?? dayTasks[0]?.vibeTags?.[0] ?? "";
      const firstTitle = dayTasks[0]?.title ?? "";
      return {
        key: date.toISOString(),
        date,
        offset,
        dotCount: dayTasks.length,
        contextSeed,
        firstTitle,
        weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
      };
    });
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    if (viewMode === "list") {
      return tasks
        .filter((task) => task.status === activeStatusTab)
        .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));
    }
    const target = new Date();
    target.setDate(target.getDate() + selectedDayOffset);
    const targetKey = target.toDateString();
    const filtered = tasks.filter((task) => {
      if (!task.dueAt) return selectedDayOffset === 0;
      return new Date(task.dueAt).toDateString() === targetKey;
    });
    return filtered.filter((task) => task.status === activeStatusTab);
  }, [activeStatusTab, selectedDayOffset, tasks, viewMode]);

  const onParse = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setParseStatus("");
    try {
      const parsed = await parseBrainDump(input);
      const fallbackIso = pickedDate
        ? new Date(`${pickedDate}T09:00:00`).toISOString()
        : new Date(Date.now() + selectedDayOffset * 24 * 60 * 60 * 1000).toISOString();
      const resolvedTasks = parsed.tasks.map((task) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: task.title,
        vibeTags: task.vibeTags,
        dueAt: pickedDate ? fallbackIso : task.dueAt ?? fallbackIso,
        status: task.status ?? "To Do",
      }));
      addTasks(resolvedTasks);

      const firstDue = resolvedTasks[0]?.dueAt;
      if (firstDue) {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const target = new Date(firstDue);
        target.setHours(0, 0, 0, 0);
        const offset = Math.round((target.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000));
        setSelectedDayOffset(offset);
      }

      if (gcalConnected && autoCreateGcalEvents) {
        await Promise.all(
          resolvedTasks.map((task) =>
            createGoogleCalendarEvent({ title: task.title, startAt: task.dueAt })
          )
        );
        setCalendarStatus("Calendar: synced (new tasks also created in GCal)");
      }
      setInput("");
      setPickedDate("");
      if (parsed.uncertain) {
        setParseStatus("Saved quickly in offline mode. Agent enrichment will improve with backend.");
      }
    } catch {
      setParseStatus("Could not create task. Please try again.");
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
      setGcalConnected(result.connected);
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
            status: "To Do",
          }))
        );
      }
    } catch {
      setCalendarStatus("Calendar: service unavailable");
    }
  };

  const connectCalendar = async () => {
    try {
      const result = await connectGoogleCalendar();
      setGcalConnected(result.connected);
      setCalendarStatus(result.connected ? "Google Calendar connected" : "Google Calendar not connected");
    } catch {
      setCalendarStatus("Google Calendar connection failed");
    }
  };

  if (Platform.OS === "web") {
    return (
      <LinearGradient colors={[THEME.colors.bgStart, THEME.colors.bgEnd]} style={[styles.screen, { padding: 16 }]}>
        <QuoteBanner quote={MOTIVATIONAL_QUOTES[quoteIndex]} />
        <Text style={styles.header}>Orbit</Text>
        <View style={styles.segmentPanel}>
        <View style={styles.modeRow}>
          <Pressable onPress={() => setViewMode("list")} style={[styles.modeButton, viewMode === "list" && styles.modeButtonActive]}>
            <Text style={styles.modeText}>List View</Text>
          </Pressable>
          <Pressable onPress={() => setViewMode("week")} style={[styles.modeButton, viewMode === "week" && styles.modeButtonActive]}>
            <Text style={styles.modeText}>Week View</Text>
          </Pressable>
          <Pressable onPress={() => setViewMode("calendar")} style={[styles.modeButton, viewMode === "calendar" && styles.modeButtonActive]}>
            <Text style={styles.modeText}>Calendar View</Text>
          </Pressable>
          <Pressable onPress={() => setShowGcalOptions((v) => !v)} style={[styles.modeButton, { marginLeft: "auto" }]}>
            <Text style={styles.modeText}>{gcalConnected ? "GCal Connected" : "Connect GCal"}</Text>
          </Pressable>
        </View>
        {showGcalOptions ? (
          <View style={styles.gcalOptionsPanel}>
            <Pressable onPress={connectCalendar} style={styles.gcalOptionButton}>
              <Text style={styles.gcalOptionText}>{gcalConnected ? "Reconnect Account" : "Connect Account"}</Text>
            </Pressable>
            <Pressable onPress={loadCalendar} style={styles.gcalOptionButton}>
              <Text style={styles.gcalOptionText}>Import from GCal</Text>
            </Pressable>
            <Pressable onPress={() => setAutoCreateGcalEvents((v) => !v)} style={styles.gcalOptionButton}>
              <Text style={styles.gcalOptionText}>Auto-create events: {autoCreateGcalEvents ? "ON" : "OFF"}</Text>
            </Pressable>
          </View>
        ) : null}
        <Text style={styles.calendarStatus}>{calendarStatus}</Text>
        {viewMode === "calendar" ? (
          <MonthGrid days={monthDays} selectedDayOffset={selectedDayOffset} setSelectedDayOffset={setSelectedDayOffset} />
        ) : viewMode === "week" ? (
        <CalendarRow
          weekDays={weekDays}
          selectedDayOffset={selectedDayOffset}
          setSelectedDayOffset={setSelectedDayOffset}
        />
        ) : null}
        <Text style={styles.sectionTitle}>{viewMode === "list" ? "All Tasks" : "Today Queue"}</Text>
        </View>
        <View style={styles.segmentPanel}>
        <StatusTabs statuses={statuses} activeStatusTab={activeStatusTab} setActiveStatusTab={setActiveStatusTab} />
        </View>
        {visibleTasks.length === 0 && <Text style={styles.emptyState}>No tasks for this day yet.</Text>}
        {visibleTasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            onComplete={() => handleComplete(task.id)}
            onSnooze={() => snoozeTask(task.id)}
            onDelete={() => deleteTask(task.id)}
            onSetStatus={(status) => updateTaskStatus(task.id, status)}
            statuses={statuses}
            depthIndex={index}
          />
        ))}
        <DatePickerRow pickedDate={pickedDate} setPickedDate={setPickedDate} />
        <LinearGradient colors={["rgba(0,229,255,0.35)", "rgba(255,43,214,0.28)"]} style={styles.inputShell}>
        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={onParse}
            returnKeyType="send"
            placeholder="Dump a thought..."
            placeholderTextColor="#6B80A8"
            style={styles.input}
          />
          <Pressable style={styles.button} onPress={onParse}>
            <Text style={styles.buttonText}>{loading ? "..." : "Create Task"}</Text>
          </Pressable>
        </View>
        </LinearGradient>
        {parseStatus ? <Text style={styles.statusText}>{parseStatus}</Text> : null}
      </LinearGradient>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView style={styles.screen}>
      <LinearGradient colors={[THEME.colors.bgStart, THEME.colors.bgEnd]} style={styles.backgroundLayer} />
      <Animated.View style={[styles.nebulaBlob, styles.nebulaBlobOne, nebulaDriftStyle]} />
      <Animated.View style={[styles.nebulaBlob, styles.nebulaBlobTwo, nebulaDriftStyle]} />
      <View style={styles.middleLayer}>
        <QuoteBanner quote={MOTIVATIONAL_QUOTES[quoteIndex]} />
        <Text style={styles.header}>Orbit</Text>
        <View style={styles.segmentPanel}>
        <View style={styles.modeRow}>
          <Pressable onPress={() => setViewMode("list")} style={[styles.modeButton, viewMode === "list" && styles.modeButtonActive]}>
            <Text style={styles.modeText}>List View</Text>
          </Pressable>
          <Pressable onPress={() => setViewMode("week")} style={[styles.modeButton, viewMode === "week" && styles.modeButtonActive]}>
            <Text style={styles.modeText}>Week View</Text>
          </Pressable>
          <Pressable onPress={() => setViewMode("calendar")} style={[styles.modeButton, viewMode === "calendar" && styles.modeButtonActive]}>
            <Text style={styles.modeText}>Calendar View</Text>
          </Pressable>
          <Pressable onPress={() => setShowGcalOptions((v) => !v)} style={[styles.modeButton, { marginLeft: "auto" }]}>
            <Text style={styles.modeText}>{gcalConnected ? "GCal Connected" : "Connect GCal"}</Text>
          </Pressable>
        </View>
        {showGcalOptions ? (
          <View style={styles.gcalOptionsPanel}>
            <Pressable onPress={connectCalendar} style={styles.gcalOptionButton}>
              <Text style={styles.gcalOptionText}>{gcalConnected ? "Reconnect Account" : "Connect Account"}</Text>
            </Pressable>
            <Pressable onPress={loadCalendar} style={styles.gcalOptionButton}>
              <Text style={styles.gcalOptionText}>Import from GCal</Text>
            </Pressable>
            <Pressable onPress={() => setAutoCreateGcalEvents((v) => !v)} style={styles.gcalOptionButton}>
              <Text style={styles.gcalOptionText}>Auto-create events: {autoCreateGcalEvents ? "ON" : "OFF"}</Text>
            </Pressable>
          </View>
        ) : null}
        <Text style={styles.calendarStatus}>{calendarStatus}</Text>
        {viewMode === "calendar" ? (
          <MonthGrid days={monthDays} selectedDayOffset={selectedDayOffset} setSelectedDayOffset={setSelectedDayOffset} />
        ) : viewMode === "week" ? (
        <CalendarRow
          weekDays={weekDays}
          selectedDayOffset={selectedDayOffset}
          setSelectedDayOffset={setSelectedDayOffset}
        />
        ) : null}
        <Text style={styles.sectionTitle}>{viewMode === "list" ? "All Tasks" : "Today Queue"}</Text>
        </View>
        <View style={styles.segmentPanel}>
        <StatusTabs statuses={statuses} activeStatusTab={activeStatusTab} setActiveStatusTab={setActiveStatusTab} />
        </View>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: true,
          })}
          scrollEventThrottle={16}
        >
          <Animated.View style={listParallaxStyle}>
          {visibleTasks.length === 0 && <Text style={styles.emptyState}>No tasks for this day yet.</Text>}
          {visibleTasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={() => handleComplete(task.id)}
              onSnooze={() => snoozeTask(task.id)}
              onDelete={() => deleteTask(task.id)}
              onSetStatus={(status) => updateTaskStatus(task.id, status)}
              statuses={statuses}
              depthIndex={index}
            />
          ))}
          </Animated.View>
        </Animated.ScrollView>
      </View>

      <View style={styles.foregroundLayer}>
        <Animated.View style={planetFloatStyle}>
          <MomentumPlanet score={momentumScore} />
          <CompletionBurst trigger={burstTrigger} />
        </Animated.View>
        <DatePickerRow pickedDate={pickedDate} setPickedDate={setPickedDate} />
        <LinearGradient colors={["rgba(0,229,255,0.35)", "rgba(255,43,214,0.28)"]} style={styles.inputShell}>
        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={onParse}
            returnKeyType="send"
            placeholder="Dump a thought..."
            placeholderTextColor="#6B80A8"
            style={styles.input}
          />
          <Pressable style={styles.button} onPress={onParse}>
            <Text style={styles.buttonText}>{loading ? "..." : "Create Task"}</Text>
          </Pressable>
        </View>
        </LinearGradient>
        {parseStatus ? <Text style={styles.statusText}>{parseStatus}</Text> : null}
      </View>

      <StatusBar style="light" />
    </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.bgStart },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: THEME.colors.bgStart,
  },
  nebulaBlob: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.25,
  },
  nebulaBlobOne: {
    width: 220,
    height: 220,
    top: 80,
    left: -40,
    backgroundColor: "#142B4A",
  },
  nebulaBlobTwo: {
    width: 180,
    height: 180,
    top: 280,
    right: -20,
    backgroundColor: "#29153F",
  },
  middleLayer: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  foregroundLayer: {
    alignItems: "center",
    paddingBottom: 20,
    gap: 12,
  },
  header: { color: THEME.colors.textPrimary, fontSize: 34, fontWeight: "800", marginBottom: 10 },
  sectionTitle: { color: THEME.colors.textSecondary, fontSize: 13, marginTop: 8, marginBottom: 8, letterSpacing: 0.6 },
  segmentPanel: {
    backgroundColor: "rgba(12,18,40,0.78)",
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.28)",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  modeRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  modeButton: {
    borderWidth: 1,
    borderColor: "rgba(146,168,204,0.45)",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "rgba(12,18,40,0.85)",
  },
  modeButtonActive: { backgroundColor: "rgba(0,229,255,0.2)", borderColor: "#00E5FF" },
  modeText: { color: "#CFE6FF", fontSize: 12, fontWeight: "700" },
  gcalOptionsPanel: {
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.35)",
    borderRadius: 10,
    backgroundColor: "rgba(9,15,35,0.9)",
    padding: 8,
    gap: 6,
  },
  gcalOptionButton: {
    borderWidth: 1,
    borderColor: "rgba(146,168,204,0.45)",
    borderRadius: 8,
    backgroundColor: "rgba(12,18,40,0.9)",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  gcalOptionText: { color: "#9ED7FF", fontSize: 11, fontWeight: "700" },
  calendarStatus: { color: "#8EA5CE", marginBottom: 8, fontSize: 12 },
  emptyState: { color: "#6B80A8", fontSize: 13, marginBottom: 12 },
  statusText: { color: "#9ED7FF", fontSize: 12, marginTop: 8, textAlign: "center", width: "94%" },
  inputShell: {
    width: "94%",
    borderRadius: 12,
    padding: 1,
  },
  inputBar: {
    width: "100%",
    flexDirection: "row",
    backgroundColor: "rgba(9,15,35,0.96)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.35)",
    padding: 8,
  },
  input: { flex: 1, color: "#EAF6FF", paddingHorizontal: 10 },
  button: {
    backgroundColor: "#FF2BD6",
    borderRadius: 8,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  buttonText: { color: "#FFE8FF", fontWeight: "800" },
  statusTabsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  statusTab: {
    borderRadius: 8,
    minWidth: 112,
    height: 34,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  statusTabActive: {
    borderColor: "#00E5FF",
    backgroundColor: "rgba(0,229,255,0.2)",
  },
  statusTabIdle: {
    borderColor: "rgba(146,168,204,0.45)",
    backgroundColor: "rgba(12,18,40,0.9)",
  },
  statusTabTextActive: {
    color: "#ECF6FF",
    fontWeight: "700",
    fontSize: 12,
  },
  statusTabTextIdle: {
    color: "#92A8CC",
    fontWeight: "700",
    fontSize: 12,
  },
  quoteBanner: {
    borderWidth: 1,
    borderColor: "rgba(255,43,214,0.45)",
    backgroundColor: "rgba(25,12,44,0.72)",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  quoteText: {
    color: "#F2D8FF",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  tile: {
    width: "23.5%",
    minWidth: 76,
    aspectRatio: 0.88,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(146,168,204,0.35)",
    overflow: "hidden",
    backgroundColor: "rgba(12,18,40,0.9)",
  },
  tileSelected: {
    borderColor: "#00E5FF",
    borderWidth: 2,
  },
  tileToday: {
    borderColor: "#FF2BD6",
  },
  tileGradient: {
    flex: 1,
    padding: 8,
    justifyContent: "space-between",
  },
  tileHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tileWeekday: {
    color: "#92A8CC",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  tileDay: {
    color: "#ECF6FF",
    fontSize: 16,
    fontWeight: "800",
  },
  tileArtWrap: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  tileArt: {
    fontSize: 32,
    opacity: 0.92,
  },
  tileFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  tileTaskTitle: {
    color: "#ECF6FF",
    fontSize: 10,
    fontWeight: "600",
    flex: 1,
  },
  tileBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: "#FF2BD6",
    alignItems: "center",
    justifyContent: "center",
  },
  tileBadgeText: {
    color: "#FFE8FF",
    fontSize: 10,
    fontWeight: "800",
  },
  tileEmptyText: {
    color: "#6B80A8",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  dateRow: {
    width: "94%",
    alignSelf: "center",
    backgroundColor: "rgba(12,18,40,0.78)",
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.28)",
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
    gap: 6,
  },
  dateRowLabel: {
    color: "#9ED7FF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  dateRowOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  dateChip: {
    borderWidth: 1,
    borderColor: "rgba(146,168,204,0.45)",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "rgba(12,18,40,0.9)",
  },
  dateChipActive: {
    borderColor: "#00E5FF",
    backgroundColor: "rgba(0,229,255,0.2)",
  },
  dateChipText: { color: "#CFE6FF", fontSize: 11, fontWeight: "700" },
  dateChipTextActive: { color: "#ECF6FF" },
  dateClear: {
    borderWidth: 1,
    borderColor: "rgba(255,43,214,0.5)",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "rgba(60,10,50,0.7)",
  },
  dateClearText: { color: "#FFD1F6", fontSize: 11, fontWeight: "700" },
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
              borderRadius: 8,
              borderWidth: 1,
              borderColor: selected ? "#00E5FF" : "rgba(146,168,204,0.45)",
              backgroundColor: selected ? "rgba(0,229,255,0.2)" : "rgba(12,18,40,0.9)",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#92A8CC", fontSize: 11 }}>{day.short}</Text>
            <Text style={{ color: "#ECF6FF", fontWeight: "700" }}>{day.day}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type MonthGridProps = {
  days: {
    key: string;
    date: Date;
    offset: number;
    dotCount: number;
    contextSeed: string;
    firstTitle: string;
    weekday: string;
  }[];
  selectedDayOffset: number;
  setSelectedDayOffset: (offset: number) => void;
};

function MonthGrid({ days, selectedDayOffset, setSelectedDayOffset }: MonthGridProps) {
  const today = new Date().toDateString();
  return (
    <View style={styles.tileGrid}>
      {days.map((item) => {
        const selected = item.offset === selectedDayOffset;
        const isToday = item.date.toDateString() === today;
        const ctx = contextTheme(item.contextSeed);
        const empty = item.dotCount === 0;
        return (
          <Pressable
            key={item.key}
            onPress={() => setSelectedDayOffset(item.offset)}
            style={[
              styles.tile,
              selected && styles.tileSelected,
              isToday && !selected && styles.tileToday,
            ]}
          >
            <LinearGradient
              colors={empty ? ["rgba(12,18,40,0.95)", "rgba(9,15,35,0.95)"] : ctx.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.tileGradient}
            >
              <View style={styles.tileHeader}>
                <Text style={styles.tileWeekday}>{item.weekday.toUpperCase()}</Text>
                <Text style={styles.tileDay}>{item.date.getDate()}</Text>
              </View>

              <View style={styles.tileArtWrap}>
                <Text style={styles.tileArt}>{empty ? "·" : ctx.emoji}</Text>
              </View>

              <View style={styles.tileFooter}>
                {item.dotCount > 0 ? (
                  <>
                    <Text numberOfLines={1} style={styles.tileTaskTitle}>
                      {item.firstTitle}
                    </Text>
                    <View style={styles.tileBadge}>
                      <Text style={styles.tileBadgeText}>{item.dotCount}</Text>
                    </View>
                  </>
                ) : (
                  <Text style={styles.tileEmptyText}>free</Text>
                )}
              </View>
            </LinearGradient>
          </Pressable>
        );
      })}
    </View>
  );
}

type ContextTheme = {
  emoji: string;
  colors: [string, string];
};

function contextTheme(seed: string): ContextTheme {
  const s = seed.toLowerCase();
  if (s.includes("run") || s.includes("gym") || s.includes("workout") || s.includes("yoga"))
    return { emoji: "🏃", colors: ["rgba(0,229,255,0.35)", "rgba(0,140,255,0.22)"] };
  if (s.includes("study") || s.includes("read") || s.includes("learn"))
    return { emoji: "📘", colors: ["rgba(120,120,255,0.35)", "rgba(60,40,180,0.28)"] };
  if (s.includes("meeting") || s.includes("call") || s.includes("sync") || s.includes("standup"))
    return { emoji: "💼", colors: ["rgba(255,43,214,0.32)", "rgba(120,20,120,0.28)"] };
  if (s.includes("buy") || s.includes("shop") || s.includes("grocery"))
    return { emoji: "🛒", colors: ["rgba(255,200,80,0.35)", "rgba(220,100,40,0.25)"] };
  if (s.includes("mom") || s.includes("dad") || s.includes("family") || s.includes("home"))
    return { emoji: "🏠", colors: ["rgba(255,160,90,0.32)", "rgba(200,60,90,0.25)"] };
  if (s.includes("cook") || s.includes("dinner") || s.includes("lunch") || s.includes("eat"))
    return { emoji: "🍳", colors: ["rgba(255,140,60,0.35)", "rgba(180,40,40,0.25)"] };
  if (s.includes("code") || s.includes("debug") || s.includes("build") || s.includes("deploy"))
    return { emoji: "💻", colors: ["rgba(80,255,200,0.3)", "rgba(20,120,140,0.25)"] };
  if (s.includes("travel") || s.includes("flight") || s.includes("trip"))
    return { emoji: "✈️", colors: ["rgba(120,200,255,0.35)", "rgba(40,80,200,0.25)"] };
  if (s.includes("write") || s.includes("journal") || s.includes("note"))
    return { emoji: "✍️", colors: ["rgba(200,180,255,0.32)", "rgba(100,60,180,0.25)"] };
  if (s.includes("clean") || s.includes("laundry"))
    return { emoji: "🧺", colors: ["rgba(170,255,200,0.3)", "rgba(40,140,120,0.25)"] };
  if (s.includes("music") || s.includes("play"))
    return { emoji: "🎧", colors: ["rgba(255,120,200,0.32)", "rgba(120,30,140,0.25)"] };
  return { emoji: "✨", colors: ["rgba(0,229,255,0.22)", "rgba(255,43,214,0.18)"] };
}

type StatusTabsProps = {
  statuses: string[];
  activeStatusTab: string;
  setActiveStatusTab: (status: string) => void;
};

function StatusTabs({ statuses, activeStatusTab, setActiveStatusTab }: StatusTabsProps) {
  return (
    <View style={styles.statusTabsWrap}>
      {statuses.map((status) => {
        const active = status === activeStatusTab;
        return (
          <Pressable
            key={status}
            onPress={() => setActiveStatusTab(status)}
            style={[styles.statusTab, active ? styles.statusTabActive : styles.statusTabIdle]}
          >
            <Text style={active ? styles.statusTabTextActive : styles.statusTabTextIdle}>{status}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type DatePickerRowProps = {
  pickedDate: string;
  setPickedDate: (value: string) => void;
};

function DatePickerRow({ pickedDate, setPickedDate }: DatePickerRowProps) {
  const toIsoDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };
  const nextMonday = () => {
    const d = new Date();
    const daysAhead = ((1 - d.getDay() + 7) % 7) || 7;
    return toIsoDate(daysAhead);
  };
  const quickOptions: { label: string; value: string }[] = [
    { label: "Today", value: toIsoDate(0) },
    { label: "Tomorrow", value: toIsoDate(1) },
    { label: "+2d", value: toIsoDate(2) },
    { label: "+3d", value: toIsoDate(3) },
    { label: "Next Mon", value: nextMonday() },
  ];
  const label = pickedDate ? new Date(`${pickedDate}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "No date";

  return (
    <View style={styles.dateRow}>
      <Text style={styles.dateRowLabel}>Due: {label}</Text>
      <View style={styles.dateRowOptions}>
        {quickOptions.map((opt) => {
          const active = pickedDate === opt.value;
          return (
            <Pressable key={opt.label} onPress={() => setPickedDate(active ? "" : opt.value)} style={[styles.dateChip, active && styles.dateChipActive]}>
              <Text style={[styles.dateChipText, active && styles.dateChipTextActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
        {Platform.OS === "web" ? (
          // @ts-ignore -- intentional: HTML input for rich date picker on web
          <input
            type="date"
            value={pickedDate}
            onChange={(e: any) => setPickedDate(e.target.value)}
            style={webDateInputStyle}
          />
        ) : null}
        {pickedDate ? (
          <Pressable onPress={() => setPickedDate("")} style={styles.dateClear}>
            <Text style={styles.dateClearText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const webDateInputStyle = {
  background: "rgba(12,18,40,0.9)",
  color: "#ECF6FF",
  border: "1px solid rgba(0,229,255,0.35)",
  borderRadius: 8,
  padding: "6px 8px",
  fontSize: 12,
  fontWeight: 700,
  outline: "none",
} as const;

function QuoteBanner({ quote }: { quote: string }) {
  return (
    <View style={styles.quoteBanner}>
      <Text style={styles.quoteText}>{quote}</Text>
    </View>
  );
}

const MOTIVATIONAL_QUOTES = [
  "Tiny progress every day compounds into massive wins.",
  "Discipline is choosing your future over your mood.",
  "One task at a time. Momentum beats perfection.",
  "Do it tired. Do it scared. Just keep orbiting forward.",
  "Your next action decides your next identity.",
];
