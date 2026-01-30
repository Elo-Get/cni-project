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
  const maskRef = useRef<HTMLDivElement>(null); 
  const containerRef = useRef<HTMLDivElement>(null); 
  
  const [isMounted, setIsMounted] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const capture = useCallback(() => {
    const video = webcamRef.current?.video;
    const mask = maskRef.current;
    const container = containerRef.current;

    if (!video || !mask || !container) return;

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    const videoRect = video.getBoundingClientRect();
    const maskRect = mask.getBoundingClientRect();

    const scaleX = videoWidth / videoRect.width;
    const scaleY = videoHeight / videoRect.height;

    const maskX = (maskRect.left - videoRect.left) * scaleX;
    const maskY = (maskRect.top - videoRect.top) * scaleY;
    const maskWidth = maskRect.width * scaleX;
    const maskHeight = maskRect.height * scaleY;

    const canvas = document.createElement("canvas");
    canvas.width = maskWidth;
    canvas.height = maskHeight;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.drawImage(
        video,
        maskX,       
        maskY,       
        maskWidth,   
        maskHeight, 
        0,          
        0,           
        maskWidth,  
        maskHeight  
      );

      const croppedImage = canvas.toDataURL("image/jpeg", 0.9);
      onCapture(croppedImage);
    }
  }, [webcamRef, onCapture]);

  if (!isMounted) return <div className="w-full h-[600px] bg-neutral-900 rounded-3xl" />;

  return (
    <div 
      ref={containerRef}
      className="relative w-full max-w-md mx-auto overflow-hidden rounded-3xl shadow-2xl border border-white/10 bg-black h-[600px] flex flex-col"
    >
      <div className="relative flex-1 bg-black w-full h-full overflow-hidden">
        {cameraError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 p-6 text-center z-50">
            <AlertCircle className="w-12 h-12 mb-2" />
            <p>Erreur caméra</p>
          </div>
        ) : (
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            className="absolute inset-0 w-full h-full object-cover"
            mirrored={mode === "face"}
            onUserMediaError={() => setCameraError("Erreur d'accès")}
            onUserMedia={() => setCameraError(null)}
          />
        )}

        <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/50 z-10">
          
          <div
            ref={maskRef}
            className={`relative border-2 border-white/80 shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden bg-transparent
            ${
              mode === "face"
                ? "w-64 h-80 rounded-[50%]" 
                : "w-80 h-52 rounded-xl"   
            }`}
            style={{ 
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)"
            }} 
          >
            <motion.div
              initial={{ top: -10, opacity: 0 }}
              animate={{ top: "110%", opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
              className="absolute left-0 w-full h-1 bg-cyan-400 shadow-[0_0_20px_#22d3ee]"
            />
          </div>
        </div>
      </div>
      <div className="relative z-20 bg-neutral-900/90 backdrop-blur-md p-6 flex flex-col items-center gap-4 border-t border-white/10">
        <p className="text-white/80 text-sm font-medium tracking-wide text-center">
          {mode === "face" ? "Gardez votre visage dans l'ovale" : "Alignez les bords de la CNI"}
        </p>

        <button
          onClick={capture}
          disabled={!!cameraError}
          className="group flex items-center justify-center w-16 h-16 bg-white rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
        >
          <div className="w-14 h-14 border-2 border-black rounded-full flex items-center justify-center group-hover:bg-gray-200">
            <Camera className="w-6 h-6 text-black" />
          </div>
        </button>
      </div>
    </div>
  );
}