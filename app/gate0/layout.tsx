import type { Metadata } from "next";
import "./gate0.css";

export const metadata: Metadata = {
  title: "Gate 0 — Acuity certificate test",
  robots: { index: false, follow: false },
};

export default function Gate0Layout({ children }: { children: React.ReactNode }) {
  return children;
}
