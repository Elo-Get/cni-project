"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Pencil, RefreshCcw, Check } from "lucide-react";

interface SignaturePadProps {
  referenceImageBase64?: string | null;
  onSubmit: (pngDataUrl: string) => void;
}

const PAD_WIDTH = 480;
const PAD_HEIGHT = 220;

export default function SignaturePad({ referenceImageBase64, onSubmit }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const hasStrokesRef = useRef(false);
  const [hasContent, setHasContent] = useState(false);

  const getCanvasContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }, []);

  const resetCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getCanvasContext();
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0a0a0a";
    ctx.lineWidth = 2.6;
    hasStrokesRef.current = false;
    setHasContent(false);
  }, [getCanvasContext]);

  useEffect(() => {
    resetCanvas();
  }, [resetCanvas]);

  const getPointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = getPointerPos(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = getCanvasContext();
    const last = lastPointRef.current;
    if (!ctx || !last) return;

    const pos = getPointerPos(e);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPointRef.current = pos;

    if (!hasStrokesRef.current) {
      hasStrokesRef.current = true;
      setHasContent(true);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false;
    lastPointRef.current = null;
    canvasRef.current?.releasePointerCapture(e.pointerId);
  };

  const handleSubmit = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokesRef.current) return;
    onSubmit(canvas.toDataURL("image/png"));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {referenceImageBase64 && (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <p className="text-xs uppercase tracking-widest text-white/50 mb-2">
            Signature détectée sur votre CNI
          </p>
          <div className="bg-white rounded-lg p-2 flex items-center justify-center">
            <img
              src={`data:image/png;base64,${referenceImageBase64}`}
              alt="Signature de référence"
              className="max-h-24 object-contain"
            />
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-widest text-white/50 flex items-center gap-2">
            <Pencil className="w-3.5 h-3.5" /> Reproduisez votre signature
          </p>
          <button
            type="button"
            onClick={resetCanvas}
            className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition px-2 py-1 rounded-md hover:bg-white/10"
          >
            <RefreshCcw className="w-3.5 h-3.5" /> Effacer
          </button>
        </div>

        <div className="bg-white rounded-xl overflow-hidden">
          <canvas
            ref={canvasRef}
            width={PAD_WIDTH}
            height={PAD_HEIGHT}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="block w-full touch-none cursor-crosshair"
            style={{ aspectRatio: `${PAD_WIDTH} / ${PAD_HEIGHT}` }}
          />
        </div>
        <p className="text-[11px] text-white/40 mt-2">
          Dessinez avec votre doigt ou la souris.
        </p>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!hasContent}
        className="
          w-full flex items-center justify-center gap-2
          rounded-2xl px-4 py-3.5 text-sm font-semibold
          bg-gradient-to-r from-cyan-500 to-indigo-500
          text-white
          shadow-[0_14px_50px_-18px_rgba(34,211,238,0.85)]
          transition hover:brightness-110 hover:scale-[1.01]
          disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed
        "
      >
        <Check className="w-4 h-4" />
        Valider la signature
      </button>
    </motion.div>
  );
}
