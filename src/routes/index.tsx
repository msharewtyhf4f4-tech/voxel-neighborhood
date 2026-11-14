import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { loadCity } from "@/game/net/useCitySync";
import { useSession } from "@/game/net/useSession";
import { useGame } from "@/game/store";
import { LoginScreen } from "@/game/ui/LoginScreen";

const GameCanvas = lazy(() => import("@/game/GameCanvas"));

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "مدينة المشتركين — لعبة مدينة مكعبات ثلاثية الأبعاد" },
      {
        name: "description",
        content: "احصل على بيت باسمك، اجمع العملات، وتجوّل ودردش مع باقي اللاعبين مباشرة في مدينة مكعبات ثلاثية الأبعاد.",
      },
      { property: "og:title", content: "مدينة المشتركين — لعبة مكعبات جماعية" },
      {
        property: "og:description",
        content: "بيوت بأسماء اللاعبين، عملات محفوظة، ودردشة مباشرة من متصفح الجوال.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Loading({ text = "جاري بناء المدينة…" }: { text?: string }) {
  return (
    <div className="game-loading" dir="rtl">
      <div className="game-loading-cube" />
      <p>{text}</p>
    </div>
  );
}

function Index() {
  const session = useSession();
  if (session === undefined) return <Loading />;
  if (!session) return <LoginScreen />;
  return <PlayerGate userId={session.user.id} />;
}

function PlayerGate({ userId }: { userId: string }) {
  const me = useGame((s) => s.me);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setError(null);
    loadCity(userId).catch((e: unknown) => setError(e instanceof Error ? e.message : "تعذّر تحميل المدينة"));
    return () => useGame.getState().reset();
  }, [userId]);
  if (error) return <Loading text={error} />;
  if (!me || me.id !== userId) return <Loading text="جاري فتح باب بيتك…" />;
  return (
    <Suspense fallback={<Loading />}>
      <GameCanvas />
    </Suspense>
  );
}
