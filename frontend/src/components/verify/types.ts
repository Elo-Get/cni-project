export type VerifyResponse = {
  same: boolean;
  similarity: number;
  probability: number;
  threshold?: number;
};
