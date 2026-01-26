"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { VerifyResponse } from "./types";

export default function ResultPanel({
  loading,
  error,
  result,
}: {
  loading: boolean;
  error: string | null;
  result: VerifyResponse | null;
}) {
  return (
    <div className="relative rounded-3xl bg-white/5 ring-1 ring-white/10 p-6 backdrop-blur-xl overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

      <h3 className="text-base font-semibold">Résultat</h3>
      <p className="text-sm text-white/60">Analyse et comparaison des deux images</p>

      <div className="mt-5">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              className="flex items-center gap-4 py-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              <div>
                <p className="text-sm font-medium">Vérification en cours…</p>
                <p className="text-xs text-white/60">Ça peut prendre quelques secondes.</p>
              </div>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              className="rounded-2xl bg-rose-500/10 ring-1 ring-rose-500/30 p-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
            >
              <p className="text-sm font-medium text-rose-200">Erreur</p>
              <p className="mt-1 text-xs text-rose-200/80 whitespace-pre-wrap">{error}</p>
            </motion.div>
          ) : result ? (
            <motion.div
              key="result"
              className={`rounded-2xl p-5 ring-1 ${
                result.same
                  ? "bg-emerald-500/10 ring-emerald-500/30"
                  : "bg-rose-500/10 ring-rose-500/30"
              }`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
            >
              <p className="text-sm font-semibold">
                {result.same ? "Identité confirmée" : "Identité non confirmée"}
              </p>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <Stat label="Similarité" value={`${(result.similarity * 100).toFixed(1)}%`} />
                <Stat label="Probabilité" value={`${(result.probability * 100).toFixed(1)}%`} />
                <Stat label="Seuil" value={`${((result.threshold ?? 0.35) * 100).toFixed(1)}%`} />
              </div>

              <p className="mt-4 text-xs text-white/60">
                Les scores sont indicatifs. Ajuste le seuil selon tes tests.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-sm text-white/70">
                Capture un selfie + une carte, puis lance la vérification.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/20 ring-1 ring-white/10 p-3">
      <p className="text-[11px] text-white/60">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
