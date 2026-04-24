import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { parseBrainDump } from "./lib/agent";
import { connectGoogleCalendar, createGoogleCalendarEvent, fetchGoogleCalendarPreview } from "./lib/calendar";
import { TaskCard } from "./components/TaskCard";
import { THEME } from "./constants/theme";
import { useOrbitStore } from "./store/useOrbitStore";

const C = THEME.colors;

export default function App() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [parseStatus, setParseStatus] = useState("");
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);
  const [activeStatusTab, setActiveStatusTab] = useState("To Do");
  const [viewMode, setViewMode] = useState<"list" | "week" | "calendar">("list");
  const [calendarStatus, setCalendarStatus] = useState("Not connected to Google Calendar");
  const [gcalConnected, setGcalConnected] = useState(false);
  const [showGcalOptions, setShowGcalOptions] = useState(false);
  const [autoCreateGcalEvents, setAutoCreateGcalEvents] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [pickedDate, setPickedDate] = useState<string>(() => toIsoDateOffset(0));

  const {
    tasks,
    statuses,
    addTasks,
    completeTask,
    snoozeTask,
    deleteTask,
    updateTaskStatus,
  } = useOrbitStore();

  const weekDays = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - now.getDay());
    const startOfWindow = new Date(startOfThisWeek);
    startOfWindow.setDate(startOfThisWeek.getDate() + weekOffset * 7);
    return Array.from({ length: 7 }).map((_, i) => {
      const date = new Date(startOfWindow);
      date.setDate(startOfWindow.getDate() + i);
      const offset = Math.round((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      return {
        key: date.toISOString(),
        offset,
        short: date.toLocaleDateString("en-US", { weekday: "short" }),
        day: date.getDate(),
      };
    });
  }, [weekOffset]);

  const weekLabel = useMemo(() => {
    if (weekDays.length === 0) return "";
    const first = new Date(weekDays[0].key);
    const last = new Date(weekDays[weekDays.length - 1].key);
    const sameMonth = first.getMonth() === last.getMonth();
    const firstLabel = first.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const lastLabel = sameMonth
      ? String(last.getDate())
      : last.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${firstLabel} – ${lastLabel}`;
  }, [weekDays]);

  const monthDays = useMemo(() => {
    const now = new Date();
    const anchor = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const count = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const firstWeekday = anchor.getDay();
    const cells: MonthCell[] = [];
    for (let i = 0; i < firstWeekday; i++) {
      cells.push({ key: `pad-start-${i}`, kind: "pad" });
    }
    for (let i = 0; i < count; i++) {
      const date = new Date(anchor);
      date.setDate(anchor.getDate() + i);
      const offset = Math.round((date.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000));
      const dayTasks = tasks.filter(
        (task) => task.dueAt && new Date(task.dueAt).toDateString() === date.toDateString()
      );
      cells.push({
        key: date.toISOString(),
        kind: "day",
        date,
        offset,
        count: dayTasks.length,
        firstTitle: dayTasks[0]?.title ?? "",
      });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ key: `pad-end-${cells.length}`, kind: "pad" });
    }
    return cells;
  }, [tasks, monthOffset]);

  const monthLabel = useMemo(() => {
    const now = new Date();
    const anchor = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    return anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [monthOffset]);

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

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const s of statuses) out[s] = 0;
    for (const t of tasks) out[t.status] = (out[t.status] ?? 0) + 1;
    return out;
  }, [tasks, statuses]);

  const onParse = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setParseStatus("");
    try {
      const parsed = await parseBrainDump(input);
      const pickedIso = pickedDate
        ? new Date(`${pickedDate}T09:00:00`).toISOString()
        : new Date().toISOString();
      const resolvedTasks = parsed.tasks.map((task) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: task.title,
        vibeTags: task.vibeTags,
        dueAt: task.dueAt ?? pickedIso,
        status: task.status ?? "To Do",
      }));
      addTasks(resolvedTasks);

      const firstDue = resolvedTasks[0]?.dueAt;
      if (firstDue) {
        const due = new Date(firstDue);
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const target = new Date(due);
        target.setHours(0, 0, 0, 0);
        const offset = Math.round((target.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000));
        setSelectedDayOffset(offset);

        const startOfThisWeek = new Date(startOfToday);
        startOfThisWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
        const startOfDueWeek = new Date(target);
        startOfDueWeek.setDate(target.getDate() - target.getDay());
        setWeekOffset(
          Math.round(
            (startOfDueWeek.getTime() - startOfThisWeek.getTime()) / (7 * 24 * 60 * 60 * 1000)
          )
        );

        const now = new Date();
        setMonthOffset(
          (due.getFullYear() - now.getFullYear()) * 12 + (due.getMonth() - now.getMonth())
        );

        setPickedDate(
          `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(
            due.getDate()
          ).padStart(2, "0")}`
        );
      }

      if (gcalConnected && autoCreateGcalEvents) {
        await Promise.all(
          resolvedTasks.map((task) =>
            createGoogleCalendarEvent({ title: task.title, startAt: task.dueAt })
          )
        );
        setCalendarStatus("Google Calendar: synced (new task added)");
      }
      setInput("");
      if (parsed.uncertain) {
        setParseStatus("Saved offline. Backend parsing will enrich it later.");
      }
    } catch {
      setParseStatus("Could not create task. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadCalendar = async () => {
    try {
      const result = await fetchGoogleCalendarPreview();
      setGcalConnected(result.connected);
      setCalendarStatus(
        result.connected
          ? `Google Calendar synced (${result.events.length} upcoming)`
          : "Google Calendar: connect required (preview mode)"
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
      setCalendarStatus("Google Calendar: service unavailable");
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

  const content = (
    <View style={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.brand}>Orbit</Text>
          <Text style={styles.brandSub}>Tasks</Text>
        </View>
        <Pressable
          onPress={() => setShowGcalOptions((v) => !v)}
          style={[styles.ghostButton, gcalConnected && styles.ghostButtonActive]}
        >
          <Text style={[styles.ghostButtonText, gcalConnected && styles.ghostButtonTextActive]}>
            {gcalConnected ? "Google Calendar · Connected" : "Connect Google Calendar"}
          </Text>
        </Pressable>
      </View>

      {showGcalOptions ? (
        <View style={styles.card}>
          <View style={styles.optionRow}>
            <Pressable onPress={connectCalendar} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>
                {gcalConnected ? "Reconnect account" : "Connect account"}
              </Text>
            </Pressable>
            <Pressable onPress={loadCalendar} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Import events</Text>
            </Pressable>
            <Pressable
              onPress={() => setAutoCreateGcalEvents((v) => !v)}
              style={[styles.secondaryButton, autoCreateGcalEvents && styles.secondaryButtonActive]}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  autoCreateGcalEvents && styles.secondaryButtonTextActive,
                ]}
              >
                Auto-create events: {autoCreateGcalEvents ? "On" : "Off"}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.caption}>{calendarStatus}</Text>
        </View>
      ) : null}

      <View style={styles.segmentControl}>
        <SegmentButton label="List" active={viewMode === "list"} onPress={() => setViewMode("list")} />
        <SegmentButton label="Week" active={viewMode === "week"} onPress={() => setViewMode("week")} />
        <SegmentButton label="Month" active={viewMode === "calendar"} onPress={() => setViewMode("calendar")} />
      </View>

      {viewMode !== "list" ? (
        <View style={styles.card}>
          <ViewToggleHeader
            label={viewMode === "week" ? weekLabel : monthLabel}
            onPrev={() =>
              viewMode === "week" ? setWeekOffset((v) => v - 1) : setMonthOffset((v) => v - 1)
            }
            onNext={() =>
              viewMode === "week" ? setWeekOffset((v) => v + 1) : setMonthOffset((v) => v + 1)
            }
            onReset={() => (viewMode === "week" ? setWeekOffset(0) : setMonthOffset(0))}
            resetLabel={viewMode === "week" ? "This week" : "This month"}
          />
          {viewMode === "week" ? (
            <WeekStrip
              weekDays={weekDays}
              selectedDayOffset={selectedDayOffset}
              setSelectedDayOffset={setSelectedDayOffset}
            />
          ) : (
            <MonthGrid
              cells={monthDays}
              selectedDayOffset={selectedDayOffset}
              setSelectedDayOffset={setSelectedDayOffset}
            />
          )}
        </View>
      ) : null}

      <View style={styles.tabsRow}>
        {statuses.map((status) => {
          const active = status === activeStatusTab;
          return (
            <Pressable
              key={status}
              onPress={() => setActiveStatusTab(status)}
              style={[styles.tabButton, active && styles.tabButtonActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{status}</Text>
              <View style={[styles.tabCount, active && styles.tabCountActive]}>
                <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>
                  {counts[status] ?? 0}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {visibleTasks.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No tasks here</Text>
          <Text style={styles.emptyHint}>
            Type a task below (e.g. "finish report by friday 5pm") and press Enter.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {visibleTasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={() => completeTask(task.id)}
              onSnooze={() => snoozeTask(task.id)}
              onDelete={() => deleteTask(task.id)}
              onSetStatus={(status) => updateTaskStatus(task.id, status)}
              statuses={statuses}
              depthIndex={index}
            />
          ))}
        </View>
      )}

      <View style={styles.composer}>
        <InlineDateField pickedDate={pickedDate} setPickedDate={setPickedDate} />
        <TextInput
          value={input}
          onChangeText={setInput}
          onSubmitEditing={onParse}
          returnKeyType="send"
          placeholder="Add a task..."
          placeholderTextColor={C.textMuted}
          style={styles.textInput}
        />
        <Pressable style={[styles.primaryButton, loading && styles.primaryButtonDisabled]} onPress={onParse}>
          <Text style={styles.primaryButtonText}>{loading ? "Adding..." : "Add"}</Text>
        </Pressable>
      </View>
      {parseStatus ? <Text style={styles.caption}>{parseStatus}</Text> : null}
    </View>
  );

  if (Platform.OS === "web") {
    return (
      <View style={styles.screen}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
        >
          {content}
        </ScrollView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
      >
        {content}
      </ScrollView>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

// ----- subcomponents -----

function SegmentButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segmentButton, active && styles.segmentButtonActive]}>
      <Text style={[styles.segmentButtonText, active && styles.segmentButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

type ViewToggleHeaderProps = {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
  resetLabel: string;
};

function ViewToggleHeader({ label, onPrev, onNext, onReset, resetLabel }: ViewToggleHeaderProps) {
  return (
    <View style={styles.toggleHeader}>
      <Pressable onPress={onPrev} style={styles.navButton}>
        <Text style={styles.navButtonText}>‹</Text>
      </Pressable>
      <Pressable onPress={onReset} style={styles.toggleLabelWrap}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleReset}>{resetLabel}</Text>
      </Pressable>
      <Pressable onPress={onNext} style={styles.navButton}>
        <Text style={styles.navButtonText}>›</Text>
      </Pressable>
    </View>
  );
}

type WeekStripProps = {
  weekDays: { key: string; offset: number; short: string; day: number }[];
  selectedDayOffset: number;
  setSelectedDayOffset: (offset: number) => void;
};

function WeekStrip({ weekDays, selectedDayOffset, setSelectedDayOffset }: WeekStripProps) {
  return (
    <View style={styles.weekStrip}>
      {weekDays.map((day) => {
        const selected = selectedDayOffset === day.offset;
        const isToday = day.offset === 0;
        return (
          <Pressable
            key={day.key}
            onPress={() => setSelectedDayOffset(day.offset)}
            style={[
              styles.weekDay,
              selected && styles.weekDaySelected,
              !selected && isToday && styles.weekDayToday,
            ]}
          >
            <Text
              style={[
                styles.weekDayShort,
                selected && styles.weekDayShortSelected,
              ]}
            >
              {day.short.toUpperCase()}
            </Text>
            <Text
              style={[
                styles.weekDayNumber,
                selected && styles.weekDayNumberSelected,
              ]}
            >
              {day.day}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type MonthCell =
  | { key: string; kind: "pad" }
  | {
      key: string;
      kind: "day";
      date: Date;
      offset: number;
      count: number;
      firstTitle: string;
    };

type MonthGridProps = {
  cells: MonthCell[];
  selectedDayOffset: number;
  setSelectedDayOffset: (offset: number) => void;
};

function MonthGrid({ cells, selectedDayOffset, setSelectedDayOffset }: MonthGridProps) {
  const today = new Date().toDateString();
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <View>
      <View style={styles.monthWeekdayRow}>
        {weekdayLabels.map((w) => (
          <Text key={w} style={styles.monthWeekdayText}>
            {w.toUpperCase()}
          </Text>
        ))}
      </View>
      <View style={styles.monthGrid}>
        {cells.map((cell) => {
          if (cell.kind === "pad") {
            return <View key={cell.key} style={styles.monthCellPad} />;
          }
          const selected = cell.offset === selectedDayOffset;
          const isToday = cell.date.toDateString() === today;
          const hasTasks = cell.count > 0;
          return (
            <Pressable
              key={cell.key}
              onPress={() => setSelectedDayOffset(cell.offset)}
              style={[
                styles.monthCell,
                hasTasks && styles.monthCellHasTasks,
                isToday && !selected && styles.monthCellToday,
                selected && styles.monthCellSelected,
              ]}
            >
              <Text
                style={[
                  styles.monthCellDay,
                  isToday && !selected && styles.monthCellDayToday,
                  selected && styles.monthCellDaySelected,
                ]}
              >
                {cell.date.getDate()}
              </Text>
              {hasTasks ? (
                <>
                  <Text
                    numberOfLines={1}
                    style={[styles.monthCellTitle, selected && styles.monthCellTitleSelected]}
                  >
                    {cell.firstTitle}
                  </Text>
                  <View style={[styles.monthCellBadge, selected && styles.monthCellBadgeSelected]}>
                    <Text
                      style={[styles.monthCellBadgeText, selected && styles.monthCellBadgeTextSelected]}
                    >
                      {cell.count}
                    </Text>
                  </View>
                </>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type InlineDateFieldProps = {
  pickedDate: string;
  setPickedDate: (value: string) => void;
};

const NATIVE_DATE_CYCLE: { label: string; compute: () => string | "" }[] = [
  { label: "Date", compute: () => "" },
  { label: "Today", compute: () => toIsoDateOffset(0) },
  { label: "Tomorrow", compute: () => toIsoDateOffset(1) },
  { label: "+2d", compute: () => toIsoDateOffset(2) },
  { label: "+3d", compute: () => toIsoDateOffset(3) },
  { label: "Next Mon", compute: () => toIsoDateNextMonday() },
];

function toIsoDateOffset(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toIsoDateNextMonday(): string {
  const d = new Date();
  const daysAhead = ((1 - d.getDay() + 7) % 7) || 7;
  return toIsoDateOffset(daysAhead);
}

function shortDateLabel(iso: string): string {
  if (!iso) return "Date";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function InlineDateField({ pickedDate, setPickedDate }: InlineDateFieldProps) {
  if (Platform.OS === "web") {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", marginRight: 8 }}>
        {/* @ts-ignore -- HTML input for rich date picker on web */}
        <input
          type="date"
          value={pickedDate}
          onChange={(e: any) => setPickedDate(e.target.value)}
          style={webDateInputStyle}
          aria-label="Due date"
        />
      </View>
    );
  }

  const currentIndex = Math.max(
    0,
    NATIVE_DATE_CYCLE.findIndex((step) => step.compute() === pickedDate)
  );
  const onCycle = () => {
    const next = NATIVE_DATE_CYCLE[(currentIndex + 1) % NATIVE_DATE_CYCLE.length];
    setPickedDate(next.compute());
  };
  return (
    <Pressable onPress={onCycle} style={styles.inlineDateChip}>
      <Text style={styles.inlineDateChipText}>{pickedDate ? shortDateLabel(pickedDate) : "Date"}</Text>
    </Pressable>
  );
}

const webDateInputStyle = {
  background: C.surface,
  color: C.textPrimary,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 14,
  fontWeight: 500,
  outline: "none",
  minWidth: 150,
} as const;

// ----- styles -----

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bgStart },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
    maxWidth: 860,
    width: "100%",
    alignSelf: "center",
  },
  content: { gap: 14 },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  brand: {
    color: C.textPrimary,
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  brandSub: {
    color: C.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 10,
  },
  caption: { color: C.textMuted, fontSize: 12 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  segmentControl: {
    flexDirection: "row",
    backgroundColor: C.surfaceMuted,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentButtonActive: {
    backgroundColor: C.surface,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentButtonText: {
    color: C.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  segmentButtonTextActive: {
    color: C.textPrimary,
    fontWeight: "700",
  },
  ghostButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  ghostButtonActive: {
    borderColor: C.accent,
    backgroundColor: C.accentSoft,
  },
  ghostButtonText: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  ghostButtonTextActive: {
    color: C.accentStrong,
    fontWeight: "700",
  },
  secondaryButton: {
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  secondaryButtonActive: {
    borderColor: C.accent,
    backgroundColor: C.accentSoft,
  },
  secondaryButtonText: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  secondaryButtonTextActive: {
    color: C.accentStrong,
    fontWeight: "700",
  },

  toggleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  toggleLabelWrap: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  toggleLabel: {
    color: C.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  toggleReset: {
    color: C.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  navButtonText: {
    color: C.textSecondary,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 20,
  },

  weekStrip: {
    flexDirection: "row",
    gap: 6,
  },
  weekDay: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: "center",
  },
  weekDaySelected: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  weekDayToday: {
    borderColor: C.accent,
  },
  weekDayShort: {
    color: C.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  weekDayShortSelected: {
    color: "rgba(255,255,255,0.9)",
  },
  weekDayNumber: {
    color: C.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
  },
  weekDayNumberSelected: {
    color: "#FFFFFF",
  },

  monthWeekdayRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  monthWeekdayText: {
    flex: 1,
    textAlign: "center",
    color: C.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  monthCellPad: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
  },
  monthCell: {
    width: `${100 / 7 - 0.5}%`,
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    padding: 6,
    justifyContent: "space-between",
  },
  monthCellHasTasks: {
    backgroundColor: C.surfaceMuted,
  },
  monthCellToday: {
    borderColor: C.accent,
  },
  monthCellSelected: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  monthCellDay: {
    color: C.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  monthCellDayToday: {
    color: C.accentStrong,
  },
  monthCellDaySelected: {
    color: "#FFFFFF",
  },
  monthCellTitle: {
    color: C.textSecondary,
    fontSize: 9,
    fontWeight: "600",
  },
  monthCellTitleSelected: {
    color: "rgba(255,255,255,0.9)",
  },
  monthCellBadge: {
    alignSelf: "flex-start",
    backgroundColor: C.accent,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  monthCellBadgeSelected: {
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  monthCellBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  monthCellBadgeTextSelected: {
    color: C.accentStrong,
  },

  tabsRow: {
    flexDirection: "row",
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  tabButtonActive: {
    borderBottomColor: C.accent,
  },
  tabText: {
    color: C.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: {
    color: C.textPrimary,
    fontWeight: "700",
  },
  tabCount: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: C.surfaceMuted,
    alignItems: "center",
  },
  tabCountActive: {
    backgroundColor: C.accentSoft,
  },
  tabCountText: {
    color: C.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  tabCountTextActive: {
    color: C.accentStrong,
  },

  emptyCard: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    borderStyle: "dashed",
    padding: 20,
    alignItems: "center",
    backgroundColor: C.surface,
  },
  emptyTitle: {
    color: C.textSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
  emptyHint: {
    color: C.textMuted,
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },

  composer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 8,
    gap: 4,
    marginTop: 4,
  },
  textInput: {
    flex: 1,
    color: C.textPrimary,
    paddingHorizontal: 8,
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: C.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  inlineDateChip: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: C.surface,
    marginRight: 6,
  },
  inlineDateChipText: {
    color: C.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
});
