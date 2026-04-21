import { create } from "zustand";

export type OrbitTask = {
  id: string;
  title: string;
  vibeTags: string[];
  dueAt?: string;
  status: string;
};

type OrbitState = {
  tasks: OrbitTask[];
  statuses: string[];
  momentumScore: number;
  addTasks: (tasks: OrbitTask[]) => void;
  completeTask: (id: string) => void;
  snoozeTask: (id: string) => void;
  deleteTask: (id: string) => void;
  updateTaskStatus: (id: string, status: string) => void;
  addCustomStatus: (status: string) => void;
};

export const useOrbitStore = create<OrbitState>((set) => ({
  tasks: [],
  statuses: ["To Do", "In Progress", "Completed"],
  momentumScore: 25,
  addTasks: (tasks) =>
    set((state) => ({
      tasks: [...tasks, ...state.tasks],
    })),
  completeTask: (id) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, status: "Completed" } : task
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
  deleteTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
    })),
  updateTaskStatus: (id, status) =>
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? { ...task, status } : task)),
    })),
  addCustomStatus: (status) =>
    set((state) => {
      const trimmed = status.trim();
      if (!trimmed || state.statuses.includes(trimmed)) return state;
      return { statuses: [...state.statuses, trimmed] };
    }),
}));
