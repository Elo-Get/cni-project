"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import CaptureCard from "./CaptureCard";
import ResultPanel from "./ResultPanel";
import { FaceMask, IdCardMask } from "./masks";
import type { VerifyResponse } from "./types";
import { verifyIdentity } from "@/lib/api";

export default function VerificationPage() {
  const [selfie, setSelfie] = useState<Blob | null>(null);
  const [idCard, setIdCard] = useState<Blob | null>(null);

  const [threshold, setThreshold] = useState(0.35);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canRun = useMemo(() => !!selfie && !!idCard && !loading, [selfie, idCard, loading]);

  const run = async () => {
    if (!selfie || !idCard) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await verifyIdentity({ idCard, selfie, threshold });
      setResult(res);
    } catch (e: any) {
      setError(e?.message ?? "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl py-10 md:py-14 px-4 md:px-6">
      <Header />

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 grid gap-6 md:grid-cols-2">
          <CaptureCard
            title="Selfie"
            subtitle="Capture en face, lumière uniforme, sans lunettes si possible."
            mask={<FaceMask />}
            value={selfie}
            onChange={setSelfie}
            captureLabel="Capturer le selfie"
            accept="image/*"
          />

          <CaptureCard
            title="Carte d’identité"
            subtitle="Carte bien à plat, sans reflets, texte lisible."
            mask={<IdCardMask />}
            value={idCard}
            onChange={setIdCard}
            captureLabel="Capturer la carte"
            accept="image/*"
          />
        </div>

        <div className="space-y-6">
          <Controls threshold={threshold} setThreshold={setThreshold} canRun={canRun} onRun={run} />

          <ResultPanel loading={loading} error={error} result={result} />
        </div>
      </div>

      <Footer />
    </div>
  );
}

function Header() {
  return (
    <div className="text-center">
      <motion.div
        className="inline-flex items-center gap-2 rounded-full bg-white/5 ring-1 ring-white/10 px-4 py-2 text-xs text-white/70 backdrop-blur"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className="h-2 w-2 rounded-full bg-emerald-400/90" />
        Secure Face Verification
      </motion.div>

      <motion.h1
        className="mt-5 text-4xl md:text-5xl font-semibold tracking-tight"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Vérification d’identité
      </motion.h1>

      <motion.p
        className="mt-4 text-sm md:text-base text-white/60 max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.06 }}
      >
        Capture un selfie et ta carte. On compare ensuite les visages via ton API pour confirmer l’identité.
      </motion.p>
    </div>
  );
}

function Controls({
  threshold,
  setThreshold,
  canRun,
  onRun,
}: {
  threshold: number;
  setThreshold: (v: number) => void;
  canRun: boolean;
  onRun: () => void;
}) {
  return (
    <div className="relative rounded-3xl bg-white/5 ring-1 ring-white/10 p-6 backdrop-blur-xl overflow-hidden">
      {/* glow decor */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

      <h3 className="text-base font-semibold">Vérification</h3>
      <p className="text-sm text-white/60">Ajuste le seuil, puis lance l’analyse.</p>

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <label className="text-xs text-white/70">Seuil (threshold)</label>
          <span className="text-xs text-white/70">{threshold.toFixed(2)}</span>
        </div>

        <input
          type="range"
          min={0.2}
          max={0.6}
          step={0.01}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="mt-3 w-full"
        />

        <p className="mt-3 text-xs text-white/50">Plus haut = plus strict (moins de faux positifs).</p>
      </div>

      <button
        type="button"
        onClick={onRun}
        disabled={!canRun}
        className="
          mt-6 w-full rounded-2xl px-4 py-4 text-sm font-semibold
          bg-gradient-to-r from-indigo-500 to-violet-500
          text-white
          shadow-[0_14px_50px_-18px_rgba(99,102,241,0.95)]
          transition
          hover:scale-[1.01] hover:brightness-110
          disabled:opacity-40 disabled:hover:scale-100
        "
      >
        Vérifier l’identité
      </button>
    </div>
  );
}

function Footer() {
  return (
    <p className="mt-10 text-center text-xs text-white/40">
      Next.js • Tailwind • Framer Motion — UI prototype
    </p>
  );
}
