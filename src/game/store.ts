import { create } from "zustand";
import type { Resident } from "./sim/world";

export type CarState = "none" | "parked" | "driving";

export interface ChatMessage {
  id: string;
  userId: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface Me {
  id: string;
  name: string;
  house: number;
}

interface GameUI {
  me: Me | null;
  residents: Resident[];
  /** coins shown in the top bar (saved + not yet saved) */
  points: number;
  /** coins collected but not yet saved to the cloud */
  unsaved: number;
  online: number;
  carState: CarState;
  nearCar: boolean;
  chatOpen: boolean;
  messages: ChatMessage[];
  bubbles: Record<string, { id: string; text: string }>;
  /** race status line shown in the HUD, e.g. "انطلق!" or the finish time */
  raceMsg: { id: number; text: string } | null;
  start: (me: Me, coins: number, residents: Resident[], messages: ChatMessage[]) => void;
  reset: () => void;
  upsertResident: (r: Resident) => void;
  setResidents: (list: Resident[]) => void;
  addPoints: (n: number) => void;
  markSaved: (amount: number, serverTotal: number) => void;
  setOnline: (n: number) => void;
  setCarState: (s: CarState) => void;
  setNearCar: (v: boolean) => void;
  setChatOpen: (v: boolean) => void;
  addMessage: (m: ChatMessage) => void;
  setRaceMsg: (text: string | null) => void;
}

const BUBBLE_MS = 5000;

const initial = {
  me: null,
  residents: [],
  points: 0,
  unsaved: 0,
  online: 1,
  carState: "none" as CarState,
  nearCar: false,
  chatOpen: false,
  messages: [],
  bubbles: {},
  raceMsg: null as { id: number; text: string } | null,
};

export const useGame = create<GameUI>((set, get) => ({
  ...initial,
  start: (me, coins, residents, messages) =>
    set({ ...initial, me, points: coins, residents, messages }),
  reset: () => set({ ...initial }),
  upsertResident: (r) =>
    set((s) => {
      const others = s.residents.filter((x) => x.userId !== r.userId);
      return { residents: [...others, r].sort((a, b) => a.number - b.number) };
    }),
  setResidents: (list) => set({ residents: [...list].sort((a, b) => a.number - b.number) }),
  addPoints: (n) => set((s) => ({ points: s.points + n, unsaved: s.unsaved + n })),
  markSaved: (amount, serverTotal) =>
    set((s) => {
      const unsaved = Math.max(0, s.unsaved - amount);
      return { unsaved, points: serverTotal + unsaved };
    }),
  setOnline: (online) => set({ online }),
  setCarState: (carState) => set({ carState }),
  setNearCar: (nearCar) => set({ nearCar }),
  setChatOpen: (chatOpen) => set({ chatOpen }),
  setRaceMsg: (text) => set({ raceMsg: text === null ? null : { id: Date.now(), text } }),
  addMessage: (m) => {
    if (get().messages.some((x) => x.id === m.id)) return;
    set((s) => ({
      messages: [...s.messages.slice(-60), m],
      bubbles: { ...s.bubbles, [m.userId]: { id: m.id, text: m.text } },
    }));
    setTimeout(() => {
      const b = get().bubbles[m.userId];
      if (b?.id !== m.id) return;
      const next = { ...get().bubbles };
      delete next[m.userId];
      set({ bubbles: next });
    }, BUBBLE_MS);
  },
}));
