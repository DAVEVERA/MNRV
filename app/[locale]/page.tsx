import dynamic from "next/dynamic";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LocalePill } from "@/components/chat/LocalePill";
import { OrgJsonLd } from "./OrgJsonLd";

const ClippyCanvas = dynamic(
  () => import("@/components/scene/ClippyCanvas").then((m) => m.ClippyCanvas),
  { ssr: false }
);
const ChatShell = dynamic(
  () => import("@/components/chat/ChatShell").then((m) => m.ChatShell),
  { ssr: false }
);

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "intro" });

  return (
    <main className="relative h-dvh w-dvw overflow-hidden bg-ink-950">
      <ClippyCanvas />
      <LocalePill />
      <ChatShell greet={t("greet")} />
      <OrgJsonLd />
    </main>
  );
}
