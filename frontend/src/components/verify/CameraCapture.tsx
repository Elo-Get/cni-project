"use client";

import React, { useRef, useCallback, useState, useEffect } from "react";
import Webcam from "react-webcam";
import { motion } from "framer-motion";
import { Camera, AlertCircle } from "lucide-react";

interface CameraCaptureProps {
  mode: "face" | "id";
  onCapture: (imageSrc: string) => void;
}

const videoConstraints = {
  width: 1280,
  height: 720,
  facingMode: "user",
};

export default function CameraCapture({ mode, onCapture }: CameraCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // 1. Attendre que le composant soit monté côté client (Fix écran noir SSR)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      onCapture(imageSrc);
    }
  }, [webcamRef, onCapture]);

  // Si pas encore monté (SSR), on renvoie un placeholder vide pour éviter les bugs
  if (!isMounted) return <div className="w-full h-[500px] bg-black rounded-3xl" />;

  return (
    <div className="relative w-full max-w-md mx-auto overflow-hidden rounded-3xl shadow-2xl border border-white/10 bg-black h-[600px] flex flex-col">
      
      {/* Zone Caméra */}
      <div className="relative flex-1 bg-black">
        {cameraError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 p-6 text-center z-50">
            <AlertCircle className="w-12 h-12 mb-2" />
            <p>Erreur caméra : {cameraError}</p>
            <p className="text-sm text-neutral-500 mt-2">Vérifiez les permissions de votre navigateur.</p>
          </div>
        ) : (
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            className="absolute inset-0 w-full h-full object-cover"
            mirrored={mode === "face"}
            onUserMediaError={(err) => setCameraError("Accès refusé ou caméra indisponible")}
            onUserMedia={() => setCameraError(null)}
          />
        )}

        {/* Overlay Mask - Purement visuel, centré absolu */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/40 z-10">
          <div
            className={`relative border-2 border-white/80 shadow-[0_0_50px_rgba(255,255,255,0.3)] 
            ${
              mode === "face"
                ? "w-64 h-80 rounded-[50%]" // Forme Visage
                : "w-80 h-52 rounded-xl"    // Forme CNI
            }`}
          >
            {/* Scan animation */}
            <motion.div
              initial={{ top: 0, opacity: 0 }}
              animate={{ top: "100%", opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="absolute left-0 w-full h-0.5 bg-cyan-400 shadow-[0_0_15px_#22d3ee]"
            />
          </div>
        </div>
      </div>

      {/* Controls Area - Séparé du flux vidéo pour éviter l'overlap */}
      {/* Z-index 20 assure qu'il est au dessus de tout */}
      <div className="relative z-20 bg-black/80 backdrop-blur-sm p-6 pb-8 flex flex-col items-center gap-4 border-t border-white/10">
        
        {/* Texte explicatif - Maintenant dans le flux normal, au dessus du bouton */}
        <p className="text-white/90 text-sm font-medium tracking-wide text-center">
          {mode === "face" ? "Placez votre visage dans l'ovale" : "Alignez votre CNI dans le cadre"}
        </p>

        {/* Bouton déclencheur */}
        <button
          onClick={capture}
          disabled={!!cameraError}
          className="group flex items-center justify-center w-16 h-16 bg-white rounded-full hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="w-14 h-14 border-2 border-black rounded-full flex items-center justify-center group-hover:bg-gray-100">
            <Camera className="w-6 h-6 text-black" />
          </div>
        </button>
      </div>
    </div>
  );
}