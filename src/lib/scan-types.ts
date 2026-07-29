/** Client-safe scan constants and types (no server secrets). */

export const SCAN_MIN_CHARS = 250;

export type ScanTypeId = "advanced_ai" | "ai" | "writing_feedback" | "plagiarism";

export const RUNNABLE_SCAN_TYPES: ScanTypeId[] = ["advanced_ai", "ai"];
/** Detection types that hit GPTZero (excludes writing_feedback / plagiarism). */
export const DETECTION_SCAN_TYPES: ScanTypeId[] = ["advanced_ai", "ai"];

export type ScanSentence = {
  text: string;
  generatedProb: number;
  highlight?: boolean;
};

export type ScanResultPayload = {
  predictedClass: "HUMAN_ONLY" | "MIXED" | "AI_ONLY" | string;
  classProbabilities: Record<string, number>;
  confidence?: string;
  completelyGeneratedProb?: number;
  averageGeneratedProb?: number;
  sentences: ScanSentence[];
};

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
