import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Resident } from "../sim/world";
import { useGame, type ChatMessage } from "../store";

type ProfileRow = { id: string; display_name: string; house_number: number; coins: number };
type ChatRow = { id: string; user_id: string; author_name: string; body: string; created_at: string };

export const toResident = (p: ProfileRow): Resident => ({
  userId: p.id,
  number: p.house_number,
  name: p.display_name,
  coins: p.coins,
});

export const toMessage = (m: ChatRow): ChatMessage => ({
  id: m.id,
  userId: m.user_id,
  author: m.author_name,
  text: m.body,
  createdAt: m.created_at,
});

/** Loads my house, every house and recent chat, then starts the game state. */
export async function loadCity(userId: string) {
  let me: ProfileRow | null = null;
  for (let i = 0; i < 5 && !me; i++) {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, house_number, coins")
      .eq("id", userId)
      .maybeSingle();
    me = data;
    if (!me) await new Promise((r) => setTimeout(r, 600));
  }
  if (!me) throw new Error("لم نجد بيتك. حاول تسجيل الدخول مرة أخرى.");
  const [houses, chat] = await Promise.all([
    supabase.from("profiles").select("id, display_name, house_number, coins").order("house_number"),
    supabase
      .from("chat_messages")
      .select("id, user_id, author_name, body, created_at")
      .order("created_at", { ascending: false })
      .limit(40),
  ]);
  if (houses.error) throw houses.error;
  useGame
    .getState()
    .start(
      { id: me.id, name: me.display_name, house: me.house_number },
      me.coins,
      (houses.data ?? []).map(toResident),
      (chat.data ?? []).reverse().map(toMessage),
    );
}

/** Live updates: new houses, coin totals and chat messages from every player. */
export function useCityLive(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel(`city-db-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, ({ new: row }) => {
        const p = row as Partial<ProfileRow>;
        if (p.id && p.house_number != null && p.display_name != null)
          useGame.getState().upsertResident(toResident(p as ProfileRow));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, ({ new: row }) => {
        useGame.getState().addMessage(toMessage(row as ChatRow));
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled]);
}

/** Saves collected coins every few seconds (and when the tab is hidden). */
export function useCoinSaver(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let busy = false;
    const flush = async () => {
      const { unsaved } = useGame.getState();
      if (busy || unsaved <= 0) return;
      busy = true;
      const amount = Math.min(200, unsaved);
      const { data, error } = await supabase.rpc("add_coins", { p_amount: amount });
      busy = false;
      if (!error && typeof data === "number") useGame.getState().markSaved(amount, data);
    };
    const id = setInterval(flush, 5000);
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
      void flush();
    };
  }, [enabled]);
}

export async function sendChat(userId: string, text: string) {
  const body = text.trim().slice(0, 200);
  if (!body) return null;
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({ user_id: userId, body })
    .select("id, user_id, author_name, body, created_at")
    .single();
  if (error) return error.message.includes("too fast") ? "أبطئ قليلاً قبل الرسالة التالية" : "تعذر إرسال الرسالة";
  useGame.getState().addMessage(toMessage(data));
  return null;
}
