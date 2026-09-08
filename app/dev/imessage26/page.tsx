import { notFound } from "next/navigation";

import { IMessage26DevPreview } from "@/components/chat/imessage26-dev-preview";

export default function IMessage26PreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <IMessage26DevPreview />;
}
