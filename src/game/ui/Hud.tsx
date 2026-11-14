import { ArrowBigUp, Car, Coins, DoorOpen, LogOut, MessageCircle, Power, Send, Users, X } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sendChat } from "../net/useCitySync";
import { pressCarButton, type Runtime } from "../runtime";
import { useGame } from "../store";

const QUICK = ["السلام عليكم", "مرحبا يا جماعة", "وين البيت رقم ٥؟", "يلا نجمع نقاط!"];

function TopBar() {
  const points = useGame((s) => s.points);
  const population = useGame((s) => s.residents.length);
  return (
    <div className="hud-top">
      <div className="hud-panel hud-title">
        <span className="hud-logo" aria-hidden>
          ▦
        </span>
        <span>مدينة المشتركين</span>
      </div>
      <div className="hud-panel hud-stat" aria-label="عدد السكان">
        <Users className="size-4 text-hud-accent" />
        <span className="hud-stat-label">السكان</span>
        <span className="hud-stat-value">{population}</span>
      </div>
      <div className="hud-panel hud-stat" aria-label="النقاط">
        <Coins className="size-4 text-gold" />
        <span className="hud-stat-label">النقاط</span>
        <span key={points} className="hud-stat-value animate-pop">
          {points}
        </span>
      </div>
    </div>
  );
}

function SideActions({ rt }: { rt: Runtime }) {
  const carState = useGame((s) => s.carState);
  const nearCar = useGame((s) => s.nearCar);
  const chatOpen = useGame((s) => s.chatOpen);
  const setChatOpen = useGame((s) => s.setChatOpen);
  const label =
    carState === "driving" ? "انزل" : carState === "parked" && nearCar ? "اركب" : "سيارة";
  const Icon = carState === "driving" ? LogOut : carState === "parked" && nearCar ? DoorOpen : Car;
  return (
    <div className="hud-side">
      <button
        type="button"
        className="side-btn"
        data-active={carState === "parked" && nearCar ? "true" : undefined}
        onClick={() => pressCarButton(rt)}
        aria-label={label}
      >
        <Icon className="size-6" />
        <span>{label}</span>
      </button>
      <button
        type="button"
        className="side-btn"
        data-active={chatOpen ? "true" : undefined}
        onClick={() => setChatOpen(!chatOpen)}
        aria-label="الدردشة"
      >
        <MessageCircle className="size-6" />
        <span>دردشة</span>
      </button>
      <button
        type="button"
        className="side-btn side-btn-small"
        onClick={() => {
          if (window.confirm("هل تريد الخروج من المدينة؟")) void supabase.auth.signOut();
        }}
        aria-label="خروج"
      >
        <Power className="size-5" />
        <span>خروج</span>
      </button>
    </div>
  );
}

const STICK_R = 46;

function Joystick({ rt }: { rt: Runtime }) {
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const pid = useRef<number | null>(null);

  const update = (e: PointerEvent<HTMLDivElement>) => {
    const r = base.current!.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > STICK_R) {
      dx *= STICK_R / len;
      dy *= STICK_R / len;
    }
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
    rt.input.x = dx / STICK_R;
    rt.input.y = -dy / STICK_R;
  };
  const release = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== pid.current) return;
    pid.current = null;
    rt.input.x = 0;
    rt.input.y = 0;
    if (knob.current) knob.current.style.transform = "translate(0px, 0px)";
  };

  return (
    <div
      ref={base}
      className="joystick"
      aria-label="عصا التحكم"
      onPointerDown={(e) => {
        if (pid.current !== null) return;
        pid.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => {
        if (e.pointerId === pid.current) update(e);
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div ref={knob} className="joystick-knob" />
    </div>
  );
}

function JumpButton({ rt }: { rt: Runtime }) {
  return (
    <button
      type="button"
      className="jump-btn"
      aria-label="قفز"
      onPointerDown={(e) => {
        e.preventDefault();
        rt.input.jumpQueued = true;
      }}
    >
      <ArrowBigUp className="size-8" />
      <span>قفز</span>
    </button>
  );
}

function ChatPanel() {
  const messages = useGame((s) => s.messages);
  const me = useGame((s) => s.me);
  const online = useGame((s) => s.online);
  const close = useGame((s) => s.setChatOpen);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [messages]);
  const submit = async (t: string) => {
    if (!me || !t.trim()) return;
    setText("");
    setErr(await sendChat(me.id, t));
  };
  return (
    <div className="hud-panel chat-panel">
      <div className="chat-head">
        <span>
          دردشة المدينة <span className="chat-online">● {online} متصل</span>
        </span>
        <button type="button" className="chat-close" onClick={() => close(false)} aria-label="إغلاق">
          <X className="size-4" />
        </button>
      </div>
      <div ref={list} className="chat-list">
        {messages.length === 0 && <p className="chat-empty">لا توجد رسائل بعد. قل مرحباً!</p>}
        {messages.map((m) => (
          <div key={m.id} className="chat-msg" data-mine={m.userId === me?.id ? "true" : undefined}>
            <span className="chat-author">{m.author}</span>
            <span>{m.text}</span>
          </div>
        ))}
      </div>
      <div className="chat-quick">
        {QUICK.map((q) => (
          <button key={q} type="button" className="chat-chip" onClick={() => void submit(q)}>
            {q}
          </button>
        ))}
      </div>
      {err && <p className="chat-error">{err}</p>}
      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(text);
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="اكتب رسالة…"
          maxLength={200}
          className="chat-input"
        />
        <button type="submit" className="chat-send" aria-label="إرسال">
          <Send className="size-4 -scale-x-100" />
        </button>
      </form>
    </div>
  );
}

function Hint() {
  const me = useGame((s) => s.me);
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 6000);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div className="hud-panel hud-hint">
      أهلاً {me?.name}! بيتك رقم {me?.house} — اجمع العملات الذهبية
    </div>
  );
}

export function Hud({ rt }: { rt: Runtime }) {
  const chatOpen = useGame((s) => s.chatOpen);
  return (
    <div className="hud" dir="rtl">
      <TopBar />
      <SideActions rt={rt} />
      {chatOpen ? <ChatPanel /> : <Hint />}
      <Joystick rt={rt} />
      <JumpButton rt={rt} />
    </div>
  );
}
