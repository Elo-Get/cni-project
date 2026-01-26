import React from "react";

export function FaceMask() {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <div className="relative">
        {/* Outside dim */}
        <div className="h-[320px] w-[240px] rounded-[140px] border border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.50)]" />

        {/* subtle scan line */}
        <div className="absolute left-1/2 top-1/2 h-[2px] w-[240px] -translate-x-1/2 bg-emerald-400/60 blur-[0.5px]" />

        <p className="mt-4 text-center text-xs text-white/80">
          Place ton visage dans l’ovale
        </p>
      </div>
    </div>
  );
}

export function IdCardMask() {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <div className="relative">
        <div className="h-[180px] w-[320px] rounded-2xl border border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.50)]" />

        <div className="absolute left-1/2 top-1/2 h-[2px] w-[320px] -translate-x-1/2 bg-indigo-400/55 blur-[0.5px]" />

        <p className="mt-4 text-center text-xs text-white/80">
          Aligne la carte dans le cadre
        </p>
      </div>
    </div>
  );
}
