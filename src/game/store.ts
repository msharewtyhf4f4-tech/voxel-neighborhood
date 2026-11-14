import { create } from "zustand";

export type CarState = "none" | "parked" | "driving";

export interface ChatMessage {
  id: number;
  author: string;
  text: string;
  mine: boolean;
}

interface GameUI {
  points: number;
  population: number;
  carState: CarState;
  nearCar: boolean;
  chatOpen: boolean;
  messages: ChatMessage[];
  bubble: { id: number; text: string } | null;
  addPoints: (n: number) => void;
  setPopulation: (n: number) => void;
  setCarState: (s: CarState) => void;
  setNearCar: (v: boolean) => void;
  setChatOpen: (v: boolean) => void;
  sendMessage: (text: string) => void;
}

let nextId = 1;

export const useGame = create<GameUI>((set, get) => ({
  points: 0,
  population: 0,
  carState: "none",
  nearCar: false,
  chatOpen: false,
  messages: [
    {
      id: 0,
      author: "دليل المدينة",
      text: "أهلاً بك في مدينة المشتركين! امشِ في الشارع واجمع العملات الذهبية.",
      mine: false,
    },
  ],
  bubble: null,
  addPoints: (n) => set((s) => ({ points: s.points + n })),
  setPopulation: (n) => set({ population: n }),
  setCarState: (carState) => set({ carState }),
  setNearCar: (nearCar) => set({ nearCar }),
  setChatOpen: (chatOpen) => set({ chatOpen }),
  sendMessage: (raw) => {
    const text = raw.trim().slice(0, 80);
    if (!text) return;
    const id = nextId++;
    set((s) => ({
      messages: [...s.messages.slice(-30), { id, author: "أنت", text, mine: true }],
      bubble: { id, text },
    }));
    setTimeout(() => {
      if (get().bubble?.id === id) set({ bubble: null });
    }, 4500);
  },
}));
