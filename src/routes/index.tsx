import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const GameCanvas = lazy(() => import("@/game/GameCanvas"));

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "مدينة المشتركين — لعبة مدينة مكعبات ثلاثية الأبعاد" },
      {
        name: "description",
        content: "تجوّل في شارع مدينة المشتركين بشخصية خليجية، اجمع النقاط، استدعِ سيارتك ودردش مع الجميع.",
      },
      { property: "og:title", content: "مدينة المشتركين — لعبة مكعبات ثلاثية الأبعاد" },
      {
        property: "og:description",
        content: "شارع طويل ومنازل بأسماء المشتركين، تلعبها مباشرة من متصفح الجوال.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Loading() {
  return (
    <div className="game-loading" dir="rtl">
      <div className="game-loading-cube" />
      <p>جاري بناء المدينة…</p>
    </div>
  );
}

function Index() {
  return (
    <Suspense fallback={<Loading />}>
      <GameCanvas />
    </Suspense>
  );
}
