"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CameraCapture from "@/components/verify/CameraCapture";
import ElegantLoader from "@/components/verify/ElegantLoader";
import SignaturePad from "@/components/verify/SignaturePad";
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertTriangle,
  Check,
  Loader2,
} from "lucide-react";

type VerificationStep =
  | "intro"
  | "face"
  | "face-check"
  | "id"
  | "signature-extract"
  | "signature-draw"
  | "processing"
  | "result";

type VerifyFullResponse = {
  validated: boolean;
  face: {
    match: boolean;
    similarity: number;
    threshold: number;
  };
  signature: {
    match: boolean;
    score: number;
    threshold: number;
    ref_signature_base64: string;
  };
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Page() {
  const [step, setStep] = useState<VerificationStep>("intro");
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [idFaceImage, setIdFaceImage] = useState<string | null>(null);
  const [idSignatureImage, setIdSignatureImage] = useState<string | null>(null);
  const [refSignature, setRefSignature] = useState<string | null>(null);
  const [faceChecked, setFaceChecked] = useState(false);
  const [idFaceChecked, setIdFaceChecked] = useState(false);
  const [signatureChecked, setSignatureChecked] = useState(false);
  const [faceError, setFaceError] = useState<string | null>(null);
  const [idError, setIdError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyFullResponse | null>(null);

  const faceThreshold = 0.20;
  const signatureThreshold = 0.40;

  const dataURItoBlob = (dataURI: string): Blob => {
    const byteString = atob(dataURI.split(",")[1]);
    const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    return new Blob([ab], { type: mimeString });
  };

  const handleFaceCapture = async (img: string) => {
    setFaceError(null);
    setFaceChecked(false);
    setStep("face-check");

    try {
      const formData = new FormData();
      formData.append("image", dataURItoBlob(img), "selfie.png");

      const response = await fetch(`${API_URL}/detect-face`, {
        method: "POST",
        body: formData,
      });

      if (response.status === 404) {
        setFaceError(
          "Aucun visage détecté. Cadrez bien votre visage dans l'ovale et réessayez."
        );
        setStep("face");
        return;
      }

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }

      setFaceImage(img);
      setFaceChecked(true);
      setStep("id");
    } catch (e) {
      console.error("Face detection error:", e);
      setFaceError("Erreur lors de l'analyse du selfie. Réessayez.");
      setStep("face");
    }
  };

  const handleIdCapture = async (img: string) => {
    setIdError(null);
    setStep("signature-extract");

    try {
      const formData = new FormData();
      formData.append("id_image", dataURItoBlob(img), "id.png");

      const response = await fetch(`${API_URL}/detect-id-card`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }

      const payload = await response.json();
      const faceOkNow = Boolean(payload.face_detected);
      const sigOkNow = Boolean(payload.signature_detected);

      // On conserve les détections précédentes : portrait et signature
      // peuvent venir de deux captures différentes.
      const nextIdFaceImage = faceOkNow ? img : idFaceImage;
      const nextIdSignatureImage = sigOkNow ? img : idSignatureImage;

      if (faceOkNow) {
        setIdFaceImage(img);
        setIdFaceChecked(true);
      }
      if (sigOkNow) {
        setIdSignatureImage(img);
        setRefSignature(payload.signature_base64);
        setSignatureChecked(true);
      }

      const haveFace = Boolean(nextIdFaceImage);
      const haveSig = Boolean(nextIdSignatureImage);

      if (haveFace && haveSig) {
        setStep("signature-draw");
        return;
      }

      if (!faceOkNow && !sigOkNow) {
        setIdError(
          haveFace
            ? "Signature toujours non détectée. Zoomez sur la zone de signature."
            : haveSig
            ? "Portrait toujours non détecté. Recadrez pour inclure votre photo."
            : "Aucun élément détecté sur cette photo. Recadrez la carte et réessayez."
        );
      } else if (faceOkNow && !haveSig) {
        setIdError(
          "Portrait enregistré ✓. Reprenez maintenant une photo en zoomant sur la signature."
        );
      } else if (sigOkNow && !haveFace) {
        setIdError(
          "Signature enregistrée ✓. Reprenez maintenant une photo en cadrant le portrait."
        );
      }

      setStep("id");
    } catch (e) {
      console.error("Detection error:", e);
      setIdError("Erreur lors de l'analyse de la carte. Réessayez.");
      setStep("id");
    }
  };

  const handleSignatureSubmit = async (drawnPng: string) => {
    if (!faceImage || !idFaceImage || !idSignatureImage) return;
    setStep("processing");

    try {
      const formData = new FormData();
      formData.append("id_face_image", dataURItoBlob(idFaceImage), "id_face.png");
      formData.append(
        "id_signature_image",
        dataURItoBlob(idSignatureImage),
        "id_signature.png"
      );
      formData.append("selfie_image", dataURItoBlob(faceImage), "selfie.png");
      formData.append("drawn_signature", dataURItoBlob(drawnPng), "signature.png");
      formData.append("face_threshold", faceThreshold.toString());
      formData.append("signature_threshold", signatureThreshold.toString());

      const response = await fetch(`${API_URL}/verify-full`, {
        method: "POST",
        body: formData,
      });

      await new Promise((r) => setTimeout(r, 1500));

      if (!response.ok) {
        const text = await response.text();
        console.warn("API Error:", response.status, text);
        setResult(null);
      } else {
        const payload = (await response.json()) as VerifyFullResponse;
        setResult(payload);
      }
    } catch (e) {
      console.error("Verify-full error:", e);
      setResult(null);
    } finally {
      setStep("result");
    }
  };

  const restart = () => {
    setFaceImage(null);
    setIdFaceImage(null);
    setIdSignatureImage(null);
    setRefSignature(null);
    setFaceChecked(false);
    setIdFaceChecked(false);
    setSignatureChecked(false);
    setFaceError(null);
    setIdError(null);
    setResult(null);
    setStep("intro");
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-900/30 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-cyan-900/20 rounded-full blur-[100px]" />

      <div className="z-10 w-full max-w-2xl text-center">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-10 flex items-center justify-center gap-3"
        >
          <ShieldCheck className="w-8 h-8 text-cyan-400" />
          <h1 className="text-2xl font-light tracking-widest uppercase text-white/90">
            Identity<span className="font-bold text-white">Secure</span>
          </h1>
        </motion.div>

        <div className="min-h-[600px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
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
                  Selfie, carte d'identité, et signature manuscrite : 3 étapes pour
                  confirmer votre identité.
                </p>
                <button
                  onClick={() => setStep("face")}
                  className="mt-8 px-8 py-3 bg-white text-black rounded-full font-semibold hover:bg-cyan-50 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                >
                  Commencer le scan
                </button>
              </motion.div>
            )}

            {step === "face" && (
              <motion.div
                key="face"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <h3 className="mb-4 text-xl text-white/80">Étape 1/3 : Selfie</h3>
                <StatusBadges
                  faceChecked={faceChecked}
                  idFaceChecked={idFaceChecked}
                  signatureChecked={signatureChecked}
                />
                {faceError && (
                  <div className="mb-4 mx-auto max-w-md flex items-start gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 text-left">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-200/90">{faceError}</p>
                  </div>
                )}
                <CameraCapture mode="face" onCapture={handleFaceCapture} />
              </motion.div>
            )}

            {step === "face-check" && (
              <motion.div
                key="face-check"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-[500px] space-y-6"
              >
                <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
                <p className="text-white/60 text-sm">Vérification du visage...</p>
              </motion.div>
            )}

            {step === "id" && (
              <motion.div
                key="id"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <h3 className="mb-4 text-xl text-white/80">
                  Étape 2/3 : Carte d'identité
                </h3>
                <StatusBadges
                  faceChecked={faceChecked}
                  idFaceChecked={idFaceChecked}
                  signatureChecked={signatureChecked}
                />
                {idError && (
                  <div className="mb-4 mx-auto max-w-md flex items-start gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 text-left">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-200/90">{idError}</p>
                  </div>
                )}
                <CameraCapture mode="id" onCapture={handleIdCapture} />
              </motion.div>
            )}

            {step === "signature-extract" && (
              <motion.div
                key="signature-extract"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-[500px] space-y-6"
              >
                <ElegantLoader />
                <p className="text-white/60 text-sm">
                  Détection de la signature sur votre carte...
                </p>
              </motion.div>
            )}

            {step === "signature-draw" && (
              <motion.div
                key="signature-draw"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <h3 className="mb-4 text-xl text-white/80">
                  Étape 3/3 : Signature manuscrite
                </h3>
                <StatusBadges
                  faceChecked={faceChecked}
                  idFaceChecked={idFaceChecked}
                  signatureChecked={signatureChecked}
                />
                <div className="max-w-lg mx-auto">
                  <SignaturePad
                    referenceImageBase64={refSignature}
                    onSubmit={handleSignatureSubmit}
                  />
                </div>
              </motion.div>
            )}

            {step === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-[500px] space-y-6"
              >
                <StatusBadges
                  faceChecked={faceChecked}
                  idFaceChecked={idFaceChecked}
                  signatureChecked={signatureChecked}
                />
                <ElegantLoader />
                <p className="text-white/60 text-sm">
                  Analyse biométrique et signature...
                </p>
              </motion.div>
            )}

            {step === "result" && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/5 border border-white/10 rounded-3xl p-10 backdrop-blur-md"
              >
                {result?.validated ? (
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-10 h-10 text-green-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white">Identité Confirmée</h2>
                    <p className="text-neutral-400">
                      Visage et signature correspondent.
                    </p>
                    <ResultDetails result={result} />
                    <button
                      onClick={restart}
                      className="mt-4 px-6 py-2 border border-white/20 rounded-full text-sm hover:bg-white/10 transition"
                    >
                      Nouvelle vérification
                    </button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                      <XCircle className="w-10 h-10 text-red-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white">Échec de vérification</h2>
                    <p className="text-neutral-400">
                      {result
                        ? `${
                            !result.face.match ? "Le visage" : "La signature"
                          } ne correspond pas.`
                        : "Erreur lors de la vérification."}
                    </p>
                    {result && <ResultDetails result={result} />}
                    <button
                      onClick={restart}
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

function StatusBadges({
  faceChecked,
  idFaceChecked,
  signatureChecked,
}: {
  faceChecked: boolean;
  idFaceChecked: boolean;
  signatureChecked: boolean;
}) {
  return (
    <div className="mb-6 flex items-center justify-center gap-2 flex-wrap">
      <Badge label="Selfie" checked={faceChecked} />
      <Badge label="Visage CNI" checked={idFaceChecked} />
      <Badge label="Signature CNI" checked={signatureChecked} />
    </div>
  );
}

function Badge({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ring-1 ${
        checked
          ? "bg-emerald-500/15 ring-emerald-400/40 text-emerald-300"
          : "bg-white/5 ring-white/15 text-white/50"
      }`}
    >
      <span
        className={`flex items-center justify-center w-4 h-4 rounded-full ${
          checked ? "bg-emerald-400/30" : "bg-white/10"
        }`}
      >
        {checked ? (
          <Check className="w-3 h-3 text-emerald-200" />
        ) : (
          <span className="block w-1.5 h-1.5 rounded-full bg-white/40" />
        )}
      </span>
      <span>{label}</span>
    </div>
  );
}

function ResultDetails({ result }: { result: VerifyFullResponse }) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 text-left">
      <div className="rounded-xl bg-white/5 border border-white/10 p-4">
        <p className="text-xs uppercase tracking-widest text-white/50 mb-1">Visage</p>
        <p className="text-2xl font-semibold text-white">
          {(result.face.similarity * 100).toFixed(0)}%
        </p>
        <p
          className={`text-xs mt-1 ${
            result.face.match ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {result.face.match ? "Correspondance" : "Non correspondant"}
        </p>
      </div>
      <div className="rounded-xl bg-white/5 border border-white/10 p-4">
        <p className="text-xs uppercase tracking-widest text-white/50 mb-1">Signature</p>
        <p className="text-2xl font-semibold text-white">
          {(result.signature.score * 100).toFixed(0)}%
        </p>
        <p
          className={`text-xs mt-1 ${
            result.signature.match ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {result.signature.match ? "Correspondance" : "Non correspondant"}
        </p>
      </div>
    </div>
  );
}
