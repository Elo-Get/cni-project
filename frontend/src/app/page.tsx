"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CameraCapture from "@/components/verify/CameraCapture";
import ElegantLoader from "@/components/verify/ElegantLoader";
import { CheckCircle2, XCircle, ShieldCheck } from "lucide-react";

type VerificationStep = "intro" | "face" | "id" | "processing" | "result";

export default function Page() {
  const [step, setStep] = useState<VerificationStep>("intro");
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [idImage, setIdImage] = useState<string | null>(null);
  const [isMatch, setIsMatch] = useState<boolean | null>(null);

  const threshold: number = 0.20;

  // Convert Base64 to Blob for API
  const dataURItoBlob = (dataURI: string) => {
    const byteString = atob(dataURI.split(",")[1]);
    const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  const handleFaceCapture = (img: string) => {
    setFaceImage(img);
    setStep("id");
  };

  const handleIdCapture = async (img: string) => {
    setIdImage(img);
    setStep("processing");

    // Préparation de l'envoi API (comme Postman: form-data avec image1/image2 + threshold)
    const formData = new FormData();

    // Important: donner un filename pour que ça soit vraiment comme Postman
    if (faceImage) {
      formData.append("image1", dataURItoBlob(faceImage), "image1.png");
    }

    formData.append("image2", dataURItoBlob(img), "image2.png");

    // Comme Postman (champ texte dans form-data)
    formData.append("threshold", threshold.toString()); // mets 0.35 si tu veux coller exactement à l'image

    try {
      const response = await fetch("http://localhost:8000/verify", {
        method: "POST",
        body: formData,
        // NE PAS mettre Content-Type manuellement (le navigateur met le bon boundary)
      });

      // (optionnel) simulation loader
      await new Promise((r) => setTimeout(r, 2000));

      // Toujours lire la réponse (même en erreur) pour logger le JSON d'erreur de l'API
      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      if (response.ok) {
        // Ton API renvoie plutôt: { same, similarity, probability, threshold }
        // Donc on mappe vers ton state:
        const same =
          (payload && typeof payload === "object" && ("same" in payload ? payload.same : undefined)) ??
          (payload && typeof payload === "object" && ("match" in payload ? payload.match : undefined)) ??
          (payload && typeof payload === "object" && ("is_same_person" in payload ? payload.is_same_person : undefined));

        setIsMatch(Boolean(same));
      } else {
        console.warn("API Error:", response.status, payload);
        setIsMatch(false);
      }
    } catch (e) {
      console.error("Error verifying", e);
      setIsMatch(false);
    } finally {
      setStep("result");
    }
  };


  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-900/30 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-cyan-900/20 rounded-full blur-[100px]" />

      <div className="z-10 w-full max-w-2xl text-center">
        
        {/* Header */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-10 flex items-center justify-center gap-3"
        >
          <ShieldCheck className="w-8 h-8 text-cyan-400" />
          <h1 className="text-2xl font-light tracking-widest uppercase text-white/90">Identity<span className="font-bold text-white">Secure</span></h1>
        </motion.div>

        {/* Dynamic Content Area */}
        <div className="min-h-[600px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            
            {/* STEP 0: INTRO */}
            {step === "intro" && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="space-y-6"
              >
                <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/50">
                  Vérification d'identité
                </h2>
                <p className="text-neutral-400 max-w-md mx-auto">
                  Nous allons procéder à une vérification rapide. Préparez votre visage et votre pièce d'identité.
                </p>
                <button
                  onClick={() => setStep("face")}
                  className="mt-8 px-8 py-3 bg-white text-black rounded-full font-semibold hover:bg-cyan-50 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                >
                  Commencer le scan
                </button>
              </motion.div>
            )}

            {/* STEP 1: FACE CAPTURE */}
            {step === "face" && (
              <motion.div
                key="face"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <h3 className="mb-6 text-xl text-white/80">Étape 1/2 : Selfie</h3>
                <CameraCapture mode="face" onCapture={handleFaceCapture} />
              </motion.div>
            )}

            {/* STEP 2: ID CAPTURE */}
            {step === "id" && (
              <motion.div
                key="id"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <h3 className="mb-6 text-xl text-white/80">Étape 2/2 : Carte d'identité</h3>
                <CameraCapture mode="id" onCapture={handleIdCapture} />
              </motion.div>
            )}

            {/* STEP 3: PROCESSING */}
            {step === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center h-[500px]"
              >
                <ElegantLoader />
              </motion.div>
            )}

            {/* STEP 4: RESULT */}
            {step === "result" && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/5 border border-white/10 rounded-3xl p-10 backdrop-blur-md"
              >
                {isMatch ? (
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-10 h-10 text-green-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white">Identité Confirmée</h2>
                    <p className="text-neutral-400">Les données biométriques correspondent.</p>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                     <div className="mx-auto w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                      <XCircle className="w-10 h-10 text-red-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white">Échec de vérification</h2>
                    <p className="text-neutral-400">Le visage ne correspond pas à la pièce d'identité.</p>
                    <button 
                      onClick={() => setStep("intro")}
                      className="mt-4 px-6 py-2 border border-white/20 rounded-full text-sm hover:bg-white/10 transition"
                    >
                      Réessayer
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}