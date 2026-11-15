"use client";
import { useEffect, useState } from "react";

const SYM = "-_~!@#$%^&*()+=[]{}|;:,.<>?";
const mask = (t: string, n: number, r: (i: number) => number) =>
  [...t].map((c, i) => (/\s/.test(c) || i < n ? c : SYM[r(i) % SYM.length])).join("");

export default function Scramble({ text, as: Tag = "span", className }: { text: string; as?: "span" | "h1" | "h2" | "p"; className?: string }) {
  // Deterministic first frame so server and client markup match.
  const [out, setOut] = useState(() => mask(text, 0, (i) => i));
  useEffect(() => {
    const len = [...text].length;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !len) {
      const t = setTimeout(() => setOut(text), 0);
      return () => clearTimeout(t);
    }
    const total = Math.min(48, len);
    let step = 0;
    const id = setInterval(() => {
      step++;
      if (step >= total) {
        clearInterval(id);
        setOut(text);
      } else setOut(mask(text, Math.floor((len * step) / total), () => Math.floor(Math.random() * SYM.length)));
    }, 32);
    return () => clearInterval(id);
  }, [text]);
  return (
    <Tag className={className}>
      <span aria-hidden="true">{out}</span>
      <span className="sr">{text}</span>
    </Tag>
  );
}
