import { create } from "zustand";

export type OrbitTask = {
  id: string;
  title: string;
  vibeTags: string[];
  dueAt?: string;
  status: "todo" | "done";
};

type OrbitState = {
  tasks: OrbitTask[];
  momentumScore: number;
  addTasks: (tasks: OrbitTask[]) => void;
  completeTask: (id: string) => void;
  snoozeTask: (id: string) => void;
};

export const useOrbitStore = create<OrbitState>((set) => ({
  tasks: [],
  momentumScore: 25,
  addTasks: (tasks) =>
    set((state) => ({
      tasks: [...tasks, ...state.tasks],
    })),
  completeTask: (id) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, status: "done" } : task
      ),
      momentumScore: Math.min(100, state.momentumScore + 2),
    })),
  snoozeTask: (id) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              dueAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            }
          : task
      ),
    })),
}));
