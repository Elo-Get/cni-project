"use client";
import { motion } from "framer-motion";

export default function ElegantLoader() {
  return (
    <div className="flex flex-col items-center justify-center space-y-8">
      <div className="relative w-32 h-32">
        {/* Cercle extérieur rotatif */}
        <motion.span
          className="absolute inset-0 rounded-full border-t-2 border-cyan-500"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
        {/* Cercle intérieur inverse */}
        <motion.span
          className="absolute inset-4 rounded-full border-b-2 border-purple-500"
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        {/* Noyau central pulsant */}
        <motion.div
          className="absolute inset-0 m-auto w-4 h-4 bg-white rounded-full shadow-[0_0_20px_white]"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
        className="text-white/70 text-sm uppercase tracking-[0.2em]"
      >
        Analyse Biométrique...
      </motion.p>
    </div>
  );
}