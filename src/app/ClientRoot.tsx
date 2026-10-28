"use client";

import dynamic from "next/dynamic";
import { Splash } from "@/components/chrome/Splash";

/**
 * The whole app is client-rendered: the room is WebGL and every store hydrates from localStorage,
 * so server-rendering it would only produce hydration mismatches. The server sends a themed splash.
 */
const MilaApp = dynamic(() => import("@/components/MilaApp"), { ssr: false, loading: () => <Splash /> });

export function ClientRoot() {
  return <MilaApp />;
}
