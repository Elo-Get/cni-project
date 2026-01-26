"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type FacingMode = "user" | "environment";

type Props = {
  mask: React.ReactNode;
  onCapture: (blob: Blob) => void;
  disabled?: boolean;
  label?: string;
  facingMode?: FacingMode;
};

export default function CameraView({
  mask,
  onCapture,
  disabled,
  label = "Capturer",
  facingMode = "user",
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const constraints = useMemo(
    () => ({
      audio: false,
      video: {
        facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    }),
    [facingMode]
  );

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        setReady(false);
        setError(null);

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) return;

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch (e: any) {
        setError(e?.message ?? "Accès caméra refusé");
      }
    }

    start();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        for (const t of streamRef.current.getTracks()) t.stop();
        streamRef.current = null;
      }
    };
  }, [constraints]);

  const capture = async () => {
    const video = videoRef.current;
    if (!video) return;

    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, w, h);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
    );

    if (blob) onCapture(blob);
  };

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-black/60 ring-1 ring-white/10">
      <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />

      {/* scan glow */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-indigo-500/20" />
      <div className="pointer-events-none absolute -inset-6 bg-indigo-500/10 blur-3xl" />

      {mask}

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-4">
        <div className="text-xs text-white/70">
          {error ? (
            <span className="text-rose-300">Caméra: {error}</span>
          ) : ready ? (
            <span className="text-emerald-300">Caméra prête</span>
          ) : (
            <span>Initialisation caméra…</span>
          )}
        </div>

        <button
          type="button"
          onClick={capture}
          disabled={!ready || !!error || disabled}
          className="
            rounded-full px-5 py-2 text-sm font-semibold
            bg-white text-black
            shadow-[0_10px_30px_rgba(0,0,0,0.55)]
            transition
            hover:brightness-95
            disabled:opacity-40
          "
        >
          {label}
        </button>
      </div>
    </div>
  );
}
