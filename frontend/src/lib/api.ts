import type { VerifyResponse } from "@/components/verify/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function verifyIdentity(params: {
  idCard: Blob;
  selfie: Blob;
  threshold?: number;
}): Promise<VerifyResponse> {
  const { idCard, selfie, threshold } = params;

  const form = new FormData();
  form.append("image1", idCard, "id.jpg");
  form.append("image2", selfie, "selfie.jpg");

  const url = new URL("/verify", API_BASE);
  if (typeof threshold === "number") url.searchParams.set("threshold", String(threshold));

  const res = await fetch(url.toString(), {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status}`);
  }

  return res.json();
}
