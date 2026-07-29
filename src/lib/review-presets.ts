export type ReviewCategory = "professional" | "academic" | "exam" | "custom";

export type ReviewPreset = {
  key: string;
  name: string;
  category: Exclude<ReviewCategory, "custom">;
  description: string;
  instructions: string;
  tone: string;
  gradeLevel: string;
};

/** Stable builtin keys so seed is idempotent. */
export const REVIEW_PRESETS: ReviewPreset[] = [
  {
    key: "builtin:grade8-persuasive",
    name: "Grade 8 persuasive essays",
    category: "academic",
    description: "Student-friendly feedback for middle-school persuasion",
    instructions:
      "Grade these persuasive essays as a Grade 8 teacher. Use grade-appropriate standards and student-friendly tone. Identify what’s working and what needs improvement. Give one clear revision task.",
    tone: "student-friendly",
    gradeLevel: "Grade 8",
  },
  {
    key: "builtin:college-essay",
    name: "College essay coach",
    category: "academic",
    description: "Clarity, voice, and structure for admissions writing",
    instructions:
      "Review this college essay for clarity, authentic voice, structure, and specificity. Note clichés, vague claims, and missed opportunities. Suggest one high-impact revision.",
    tone: "constructive",
    gradeLevel: "College",
  },
  {
    key: "builtin:journal-abstract",
    name: "Journal abstract clarity",
    category: "academic",
    description: "Tighten abstracts for academic readers",
    instructions:
      "Review this academic abstract for precision, novelty, methods/results balance, and jargon. Flag vague claims. Suggest one concrete rewrite improvement.",
    tone: "formal",
    gradeLevel: "Graduate",
  },
  {
    key: "builtin:literature-analysis",
    name: "Literature analysis",
    category: "academic",
    description: "Thesis, evidence, and close reading",
    instructions:
      "Evaluate this literary analysis for a clear thesis, textual evidence, analysis depth, and organization. Point out summary that should be interpretation. Give one revision task.",
    tone: "constructive",
    gradeLevel: "High school",
  },
  {
    key: "builtin:cover-letter",
    name: "Cover letter coach",
    category: "professional",
    description: "Impact, relevance, and tone for hiring",
    instructions:
      "Review this cover letter for impact, relevance to a role, specificity, and professional tone. Cut fluff. Suggest one stronger opening or proof point.",
    tone: "professional",
    gradeLevel: "Professional",
  },
  {
    key: "builtin:product-update",
    name: "Product update memo",
    category: "professional",
    description: "Clear status writing for teammates",
    instructions:
      "Review this product or project update for clarity, audience fit, action items, and scannability. Flag buried leads. Give one revision task.",
    tone: "professional",
    gradeLevel: "Professional",
  },
  {
    key: "builtin:blog-draft",
    name: "Blog draft editor",
    category: "professional",
    description: "Hook, pacing, and reader value",
    instructions:
      "Edit this blog draft for hook strength, pacing, reader value, and concrete examples. Note fluff and weak transitions. Suggest one revision task.",
    tone: "constructive",
    gradeLevel: "Professional",
  },
  {
    key: "builtin:client-email",
    name: "Client email tone",
    category: "professional",
    description: "Clear, polite, actionable emails",
    instructions:
      "Review this client-facing email for clarity, politeness, actionability, and length. Soften harsh phrasing. Suggest one improved closing or CTA.",
    tone: "professional",
    gradeLevel: "Professional",
  },
  {
    key: "builtin:ap-english",
    name: "AP English rhetorical analysis",
    category: "exam",
    description: "Exam-style rhetorical analysis feedback",
    instructions:
      "Score this AP-style rhetorical analysis for thesis, evidence, commentary, and sophistication. Note exam-rubric gaps. Give one clear revision task.",
    tone: "formal",
    gradeLevel: "AP / Exam",
  },
  {
    key: "builtin:sat-essay",
    name: "SAT / timed essay",
    category: "exam",
    description: "Structure and evidence under time pressure",
    instructions:
      "Review this timed essay for thesis clarity, paragraph structure, evidence use, and conclusion. Keep feedback exam-practical. Give one revision task.",
    tone: "constructive",
    gradeLevel: "Exam",
  },
  {
    key: "builtin:toefl-writing",
    name: "TOEFL writing",
    category: "exam",
    description: "Language accuracy and organization",
    instructions:
      "Review this TOEFL-style response for organization, coherence, vocabulary range, and grammar. Prioritize clarity over style flourishes. Give one revision task.",
    tone: "student-friendly",
    gradeLevel: "Exam",
  },
  {
    key: "builtin:law-issue-spotter",
    name: "Law exam issue spotter",
    category: "exam",
    description: "IRAC structure and issue coverage",
    instructions:
      "Review this law exam answer for issue spotting, IRAC structure, rule accuracy, and application depth. Note missed issues. Give one revision task.",
    tone: "formal",
    gradeLevel: "Graduate",
  },
];

export const REVIEW_TONES = [
  "constructive",
  "student-friendly",
  "formal",
  "professional",
] as const;

export const REVIEW_GRADE_LEVELS = [
  "Grade 8",
  "High school",
  "College",
  "Graduate",
  "Professional",
  "Exam",
  "AP / Exam",
] as const;

export type ReviewResultPayload = {
  summary: string;
  strengths: string[];
  improvements: string[];
  revisionTask: string;
  scoreLabel?: string | null;
};

export function parseReviewResult(raw: unknown): ReviewResultPayload {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const asStrings = (v: unknown): string[] =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : [];
  return {
    summary: typeof obj.summary === "string" ? obj.summary : "No summary returned.",
    strengths: asStrings(obj.strengths),
    improvements: asStrings(obj.improvements),
    revisionTask:
      typeof obj.revisionTask === "string"
        ? obj.revisionTask
        : "Revise the weakest section with a clearer claim and one concrete example.",
    scoreLabel: typeof obj.scoreLabel === "string" ? obj.scoreLabel : null,
  };
}
