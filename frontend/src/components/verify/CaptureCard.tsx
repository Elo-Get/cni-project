"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CameraView from "./CameraView";
import { blobToObjectUrl, revokeObjectUrl } from "@/lib/image";

type Props = {
  title: string;
  subtitle: string;
  mask: React.ReactNode;
  value: Blob | null;
  onChange: (blob: Blob | null) => void;
  captureLabel: string;
  accept: string;
};

export default function CaptureCard({
  title,
  subtitle,
  mask,
  value,
  onChange,
  captureLabel,
  accept,
}: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      revokeObjectUrl(previewUrl);
      setPreviewUrl(null);
      return;
    }
    const url = blobToObjectUrl(value);
    setPreviewUrl(url);
    return () => revokeObjectUrl(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const onFile = async (file?: File | null) => {
    if (!file) return;
    onChange(file);
  };

  const inputId = useMemo(() => `file-${title.replace(/\s+/g, "-").toLowerCase()}`, [title]);

  return (
    <div
      className="
        relative rounded-3xl
        bg-white/5 backdrop-blur-xl
        ring-1 ring-white/10
        shadow-[0_22px_70px_-30px_rgba(0,0,0,0.85)]
        p-6 overflow-hidden
      "
    >
      {/* subtle glow */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl" />

      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-white/60">{subtitle}</p>
        </div>

        <label
          htmlFor={inputId}
          className="
            cursor-pointer rounded-xl
            bg-white/10 px-3 py-2 text-xs font-medium text-white/80
            ring-1 ring-white/10
            hover:bg-white/15
            transition
          "
        >
          Importer
        </label>

        <input
          id={inputId}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="space-y-4">
        <CameraView mask={mask} onCapture={(b) => onChange(b)} label={captureLabel} />

        <AnimatePresence>
          {previewUrl && (
            <motion.div
              className="overflow-hidden rounded-2xl bg-black/30 ring-1 ring-white/10"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt={title} className="h-44 w-full object-cover" />

              <div className="flex items-center justify-between p-3">
                <p className="text-xs text-white/70">Aperçu enregistré</p>
                <button
                  type="button"
                  onClick={() => onChange(null)}
                  className="
                    rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/80
                    ring-1 ring-white/10 hover:bg-white/15 transition
                  "
                >
                  Effacer
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
