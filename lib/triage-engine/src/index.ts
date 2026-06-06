export type TriageLevel = "urgent" | "high" | "moderate" | "routine";

export type InvestigationType = "tvus" | "mri" | "laparoscopy" | "ca125" | "fbc";

export type Pathway =
  | "medical"
  | "surgery_general"
  | "surgery_specialist"
  | "chronic_pain"
  | "combined"
  | "watchful_waiting";

export interface TriageInput {
  dysmenorrhea: number;
  chronicPelvicPain: number;
  dyspareunia: number;
  dyschezia: number;
  dysuria: number;
  infertilityHistory: boolean;
  previousSurgery: boolean;
  familyHistory: boolean;
  symptomDurationMonths: number;
  impactOnQuality: number;
  irregularBleeding: boolean;
  bloating: boolean;
  fatigue: boolean;
  bowelInvolvement: boolean;
  bladderInvolvement: boolean;
  uretericInvolvement: boolean;
  fertilityPriority: boolean;
  negativeLaparoscopy: boolean;
  chronicPainPredominant: boolean;
  symptomsControlledOnMedication: boolean;
  previousTreatmentHistory: string | null;
}

export interface InvestigationResult {
  tvusCompleted?: boolean;
  tvusEndometrioma?: boolean;
  tvusEndometriomaSize?: string;
  tvusDeepEndometriosis?: boolean;
  tvusAdenomyosis?: boolean;
  tvusNormal?: boolean;
  mriCompleted?: boolean;
  mriDeepEndometriosis?: boolean;
  mriEndometrioma?: boolean;
  mriUretericInvolvement?: boolean;
  mriBowelInvolvement?: boolean;
  mriBladderInvolvement?: boolean;
  mriNormal?: boolean;
  hydronephrosis?: boolean;
  laparoscopyCompleted?: boolean;
  laparoscopyRafsStage?: string;
  ca125Completed?: boolean;
  ca125Value?: string;
}

export interface AssessmentResult {
  triageLevel: TriageLevel;
  triageScore: number;
  suggestedStage: string;
  suggestedInvestigations: InvestigationType[];
  investigationRationale: string;
  mdtRequired: boolean;
  bsgeReferral: boolean;
  mriRequired: boolean;
  avoidGnRH: boolean;
  fertilityReferral: boolean;
  painClinic: boolean;
  psychSupport: boolean;
}

export type TreatmentStep = 1 | 2 | 3;
export type RecommendedApproach = "medical" | "surgical" | "combined" | "watchful-waiting";

export type SurgicalList = "pooled" | "specialist";

export interface SurgicalCriterion {
  label: string;
  criterion: string;
  source: string;
  met: boolean;
}

export interface SurgicalTriageResult {
  recommendedList: SurgicalList;
  recommendedListLabel: string;
  recommendationRationale: string;
  pooledCriteria: SurgicalCriterion[];
  specialistCriteria: SurgicalCriterion[];
  matchedPooledCount: number;
  matchedSpecialistCount: number;
  mdtRequired: boolean;
  bsgeReferral: boolean;
  surgeonGrade: string;
  listStatus: string;
}

export interface PrescriptionItem {
  name: string;
  dose: string;
  route: string;
  frequency: string;
  duration: string;
  courseNotes: string;
  bnfReference: string;
}

export interface ManagementPlanRecommendation {
  recommendedPathway: Pathway;
  pathwayRationale: string;
  mdtRequired: boolean;
  bsgeReferral: boolean;
  avoidGnRH: boolean;
  fertilityReferral: boolean;
  painClinic: boolean;
  psychSupport: boolean;
  // Stepwise NICE NG73 additions
  treatmentStep: TreatmentStep;
  treatmentStepRationale: string;
  recommendedApproach: RecommendedApproach;
  recommendedMedications: string[];
  medicationRationale: string;
  prescriptions: PrescriptionItem[];
  recommendedSurgicalOptions: string[];
  surgicalRoute: "pooled" | "specialist" | null;
  surgicalRouteCriteria: string[];
  recommendedLifestyle: string[];
  recommendedFollowUpWeeks: number;
  recommendedGoals: string;
}

function pathwayToApproach(p: Pathway): RecommendedApproach {
  if (p === "surgery_specialist" || p === "surgery_general") return "surgical";
  if (p === "combined") return "combined";
  if (p === "watchful_waiting") return "watchful-waiting";
  return "medical";
}

export function computeTriageAndStage(data: TriageInput): AssessmentResult {
  let score = 0;

  // ── Pain scores (VAS 0-10; maxPain × 2 = up to 20 pts) ───────────────────
  const maxPain = Math.max(
    data.dysmenorrhea,
    data.chronicPelvicPain,
    data.dyspareunia,
    data.dyschezia,
    data.dysuria
  );
  score += maxPain * 2;

  // Quality-of-life impact (0-10 × 2 = up to 20 pts)
  score += data.impactOnQuality * 2;

  // ── Clinical risk factors (NICE NG73 weighted) ────────────────────────────
  if (data.infertilityHistory) score += 15;   // NICE: infertility with suspected endo = specialist priority
  if (data.previousSurgery) score += 10;      // Recurrence post-surgery = higher severity
  if (data.familyHistory) score += 5;         // First-degree relative = moderate risk factor

  // ── Symptom duration (NICE: longer delay = under-treated, higher priority) ─
  if (data.symptomDurationMonths > 24) score += 10;
  else if (data.symptomDurationMonths > 12) score += 7;
  else if (data.symptomDurationMonths > 6) score += 4;

  // ── NICE NG73 red-flag symptoms (bowel/bladder/ureteric = deep endo) ──────
  // These carry independent weight as NICE explicitly flags them as indicators
  // of deep endometriosis requiring specialist (BSGE) referral.
  if (data.bowelInvolvement) score += 10;     // Cyclical dyschezia/rectal bleeding
  if (data.bladderInvolvement) score += 10;   // Cyclical dysuria/haematuria
  if (data.uretericInvolvement) score += 12;  // Ureteric involvement → most severe

  // ── Ancillary symptoms ────────────────────────────────────────────────────
  if (data.irregularBleeding) score += 4;
  if (data.bloating) score += 2;
  if (data.fatigue) score += 2;

  // Prior treatment failure adds urgency
  if (data.previousTreatmentHistory && data.previousTreatmentHistory.toLowerCase().includes("fail")) {
    score += 5;
  }

  // ── Score-based triage (NICE NG73-aligned thresholds) ────────────────────
  let triageLevel: TriageLevel;
  if (score >= 65) triageLevel = "urgent";
  else if (score >= 40) triageLevel = "high";
  else if (score >= 22) triageLevel = "moderate";
  else triageLevel = "routine";

  // ── NICE NG73 clinical override rules ─────────────────────────────────────
  // These override the score-based level where NICE mandates a minimum priority.

  const deepEndoSuspected = data.bowelInvolvement || data.bladderInvolvement || data.uretericInvolvement;
  const severePain = maxPain >= 7;
  const severePainBothComponents = severePain && data.impactOnQuality >= 7;

  // Rule 1: Suspected deep endometriosis → minimum HIGH
  // NICE NG73: bowel/bladder/ureteric symptoms mandate specialist (BSGE) referral.
  if (deepEndoSuspected && (triageLevel === "routine" || triageLevel === "moderate")) {
    triageLevel = "high";
  }

  // Rule 2: Deep endo + severe pain + infertility → URGENT
  // NICE NG73: complex deep endo with infertility = highest priority for specialist MDT.
  if (deepEndoSuspected && severePain && data.infertilityHistory) {
    triageLevel = "urgent";
  }

  // Rule 3: Infertility + significant symptom burden → minimum HIGH
  // NICE NG73: endometriosis-related infertility should be managed in specialist centre.
  if (data.infertilityHistory && score >= 30 && triageLevel === "moderate") {
    triageLevel = "high";
  }

  // Rule 4: Severe uncontrolled pain with major QoL impact → minimum HIGH
  // NICE NG73: severe pain preventing normal activities = expedited referral.
  if (severePainBothComponents && triageLevel === "moderate") {
    triageLevel = "high";
  }

  // Rule 5: Previous surgery + recurrent severe symptoms → minimum HIGH
  if (data.previousSurgery && severePain && triageLevel === "moderate") {
    triageLevel = "high";
  }

  // ── Clinical severity estimate (pre-laparoscopy) ──────────────────────────
  // Note: rASRM staging (I–IV) requires surgical confirmation. This is a
  // pre-operative clinical estimate to guide initial management only.
  const deepPain = data.dyspareunia >= 7 || data.dyschezia >= 7;
  let suggestedStage: string;
  if (
    triageLevel === "urgent" ||
    (deepEndoSuspected && (data.infertilityHistory || data.previousSurgery)) ||
    (severePain && deepPain && data.infertilityHistory)
  ) {
    suggestedStage = "Stage IV (clinical estimate)";
  } else if (
    triageLevel === "high" ||
    (severePain && (data.infertilityHistory || data.previousSurgery)) ||
    deepEndoSuspected
  ) {
    suggestedStage = "Stage III (clinical estimate)";
  } else if (score >= 22 || severePain) {
    suggestedStage = "Stage II (clinical estimate)";
  } else {
    suggestedStage = "Stage I (clinical estimate)";
  }

  // ── Investigation recommendations (NICE NG73) ─────────────────────────────
  const investigations: InvestigationType[] = [];
  const reasons: string[] = [];

  let mdtRequired = false;
  let bsgeReferral = false;
  let mriRequired = false;
  let avoidGnRH = false;
  let fertilityReferral = false;
  let painClinic = false;
  let psychSupport = false;

  // NICE NG73 §1.3.1: TVUS is first-line for all suspected endometriosis
  investigations.push("tvus");
  reasons.push("TVUS is first-line imaging for all suspected endometriosis — a normal TVUS does not exclude the diagnosis (NICE NG73 §1.3.1)");

  // NICE NG73 §1.3.3: MRI for suspected deep endometriosis
  if (deepEndoSuspected) {
    investigations.push("mri");
    mriRequired = true;
    mdtRequired = true;
    bsgeReferral = true;
    if (data.bowelInvolvement) reasons.push("Cyclical bowel symptoms: MRI required to map bowel involvement for surgical planning (NICE NG73 §1.3.3)");
    if (data.bladderInvolvement) reasons.push("Cyclical bladder symptoms: MRI required to assess bladder wall involvement (NICE NG73 §1.3.3)");
    if (data.uretericInvolvement) reasons.push("Ureteric symptoms: urgent MRI with urological assessment; risk of silent hydronephrosis (NICE NG73 §1.3.3)");
    reasons.push("Specialist BSGE centre referral required for confirmed or suspected deep endometriosis (NICE NG73 §1.4.4)");
  }

  // NICE NG73 §1.4.3: Consider laparoscopy when imaging is inconclusive
  const persistentSymptoms = data.symptomDurationMonths > 6 && (data.previousSurgery || score >= 22);
  if (
    (data.previousTreatmentHistory && data.previousTreatmentHistory.toLowerCase().includes("fail")) ||
    (persistentSymptoms && triageLevel !== "routine")
  ) {
    if (!investigations.includes("laparoscopy")) {
      investigations.push("laparoscopy");
    }
    reasons.push("Symptoms persist despite medical management: diagnostic laparoscopy should be offered to confirm or exclude endometriosis (NICE NG73 §1.4.3)");
  }

  // NICE NG73 §1.4.5: Fertility referral
  if (data.fertilityPriority) {
    avoidGnRH = true;
    fertilityReferral = true;
    reasons.push("Fertility priority documented: GnRH analogues/antagonists should be avoided; expedited fertility referral recommended (NICE NG73 §1.4.5)");
  }

  // NICE NG73 §1.4.6: Infertility assessment
  if (data.infertilityHistory && data.fertilityPriority) {
    if (!investigations.includes("fbc")) investigations.push("fbc");
    reasons.push("Infertility associated with endometriosis: baseline haematological workup and fertility assessment indicated");
  }

  // NICE NG73 §1.4.7: Chronic pain pathway
  if (data.negativeLaparoscopy && data.chronicPainPredominant) {
    painClinic = true;
    psychSupport = true;
    reasons.push("Chronic pelvic pain with negative laparoscopy: pain clinic referral and psychological support recommended (NICE NG73 §1.4.7)");
  }

  // Severe chronic pain without imaging findings → multi-modal pain management
  if (data.chronicPainPredominant && triageLevel === "high" && !deepEndoSuspected) {
    painClinic = true;
    psychSupport = true;
    reasons.push("Severe chronic pain: consider referral to specialist pain clinic and psychological support alongside medical management (NICE NG73 §1.4.7)");
  }

  // Recurrence after surgery → BSGE review
  if (data.previousSurgery && persistentSymptoms) {
    bsgeReferral = true;
    reasons.push("Recurrent symptoms after previous surgery: BSGE specialist review recommended before further surgical intervention (NICE NG73 §1.4.4)");
  }

  // NOTE: CA-125 is NOT recommended by NICE NG73 for diagnosis of endometriosis (§1.3.2)
  // It is not added to investigations.

  const investigationRationale = reasons.join(" • ");

  return {
    triageLevel,
    triageScore: score,
    suggestedStage,
    suggestedInvestigations: investigations,
    investigationRationale,
    mdtRequired,
    bsgeReferral,
    mriRequired,
    avoidGnRH,
    fertilityReferral,
    painClinic,
    psychSupport,
  };
}

/**
 * BNF-compliant dosing reference for medications used in endometriosis management.
 * Sources: BNF online (bnf.nice.org.uk), NICE NG73 §1.4.
 */
const BNF_DOSING: Record<string, PrescriptionItem> = {
  "Naproxen": {
    name: "Naproxen",
    dose: "250–500 mg",
    route: "Oral",
    frequency: "Twice daily with food",
    duration: "Short-term; review at 3 months",
    courseNotes: "Take with or after food to reduce GI side-effects. Avoid in renal impairment. Use lowest effective dose for shortest duration (NICE NG73 §1.4.1).",
    bnfReference: "BNF: Naproxen — musculoskeletal and joint diseases / pain",
  },
  "Combined Oral Contraceptive Pill": {
    name: "Combined Oral Contraceptive Pill",
    dose: "Standard preparation (e.g. Microgynon 30: ethinylestradiol 30 mcg / levonorgestrel 150 mcg)",
    route: "Oral",
    frequency: "Once daily (21-day cycle or continuous cycling)",
    duration: "3–6 months; review response",
    courseNotes: "Continuous (tricycling) preferred over cyclic dosing to reduce breakthrough bleeding and pain. Contraindicated in migraine with aura, history of VTE, smokers >35 years (NICE NG73 §1.4.2).",
    bnfReference: "BNF: Combined hormonal contraceptives — contraception",
  },
  "Norethisterone Acetate": {
    name: "Norethisterone Acetate",
    dose: "5 mg",
    route: "Oral",
    frequency: "Three times daily (continuously)",
    duration: "3–6 months; review response",
    courseNotes: "Continuous dosing for endometriosis (not cyclic). Monitor for androgenic side-effects (acne, weight gain). Fertility-sparing option where COC is contraindicated (NICE NG73 §1.4.3).",
    bnfReference: "BNF: Norethisterone — sex hormones / progestogens",
  },
  "Mirena IUS": {
    name: "Mirena IUS",
    dose: "52 mg levonorgestrel IUS",
    route: "Intrauterine",
    frequency: "Single insertion; releases ~20 mcg/day",
    duration: "Up to 5 years",
    courseNotes: "First-line hormonal option when oral progestogens not tolerated. Reduces dysmenorrhoea and menstrual blood loss. Fertility returns rapidly after removal (NICE NG73 §1.4.3).",
    bnfReference: "BNF: Levonorgestrel IUS — intrauterine progestogen-only contraceptives",
  },
  "Dienogest": {
    name: "Dienogest",
    dose: "2 mg",
    route: "Oral",
    frequency: "Once daily continuously",
    duration: "6–12 months; specialist review before extending",
    courseNotes: "Progestogen with endometriosis-specific evidence base. May cause irregular spotting in first 3 months. Do not use if pregnancy suspected. Suitable for long-term use (NICE NG73 §1.4.3).",
    bnfReference: "BNF: Dienogest — sex hormones / progestogens (endometriosis)",
  },
  "Elagolix": {
    name: "Elagolix",
    dose: "150 mg (low dose) or 200 mg (high dose)",
    route: "Oral",
    frequency: "Once daily (150 mg) or twice daily (200 mg)",
    duration: "Up to 24 months (150 mg) or 6 months (200 mg) without add-back",
    courseNotes: "GnRH antagonist; add-back oestrogen recommended with high-dose regimen to limit bone loss. Monitor bone density if >6 months. Not for use in pregnancy (NICE NG73 §1.4.4).",
    bnfReference: "BNF: Elagolix — gonadotrophin-releasing hormone antagonists",
  },
  "Leuprolide Acetate": {
    name: "Leuprolide Acetate",
    dose: "3.75 mg (monthly) or 11.25 mg (3-monthly depot)",
    route: "Subcutaneous or intramuscular injection",
    frequency: "Monthly or 3-monthly depot",
    duration: "Maximum 6 months without add-back HRT; specialist oversight required",
    courseNotes: "GnRH agonist; mandatory add-back HRT (low-dose oestrogen + progestogen) to protect bone density and reduce menopausal symptoms. Baseline DEXA scan recommended. Specialist initiation only (NICE NG73 §1.4.4).",
    bnfReference: "BNF: Leuprorelin acetate — gonadotrophin-releasing hormone agonists",
  },
  "Relugolix/Estradiol/Norethindrone (Myfembree)": {
    name: "Relugolix/Estradiol/Norethindrone (Myfembree)",
    dose: "Relugolix 40 mg / estradiol 1 mg / norethindrone acetate 0.5 mg",
    route: "Oral",
    frequency: "Once daily",
    duration: "Up to 24 months",
    courseNotes: "Combined GnRH antagonist with integrated add-back therapy. Bone loss risk attenuated by add-back component. Contraindicated in osteoporosis. Monitor bone density annually (NICE NG73 §1.4.4).",
    bnfReference: "BNF: Relugolix combinations — gonadotrophin-releasing hormone antagonists",
  },
  "Gabapentin": {
    name: "Gabapentin",
    dose: "300 mg (titrate to 300–1200 mg three times daily)",
    route: "Oral",
    frequency: "Three times daily; start low and titrate",
    duration: "Review at 8 weeks; continue if beneficial for neuropathic/chronic pain",
    courseNotes: "Adjunct for neuropathic/central sensitisation component of chronic pain. Requires specialist pain clinic supervision. Controlled drug (Schedule 3 in UK). Monitor for sedation, dizziness (NICE NG73 §1.4.7).",
    bnfReference: "BNF: Gabapentin — neuropathic pain / antiepileptics",
  },
  "Ibuprofen": {
    name: "Ibuprofen",
    dose: "200–400 mg",
    route: "Oral",
    frequency: "Three to four times daily with food (maximum 1.2 g/day OTC; 2.4 g/day prescribed)",
    duration: "Short-term; review at 3 months",
    courseNotes: "NSAID for dysmenorrhoea and pelvic pain. Take with or after food to reduce GI side-effects. Avoid in renal impairment, peptic ulcer disease, or if NSAIDs contraindicated. Use lowest effective dose for shortest duration (NICE NG73 §1.4.1).",
    bnfReference: "BNF: Ibuprofen — musculoskeletal and joint diseases / pain / dysmenorrhoea",
  },
  "Medroxyprogesterone Acetate": {
    name: "Medroxyprogesterone Acetate",
    dose: "150 mg (IM depot) or 10 mg (oral)",
    route: "Intramuscular injection or oral",
    frequency: "Depot: every 3 months; oral: once daily",
    duration: "Reviewed 6-monthly; consider bone health if >2 years depot use",
    courseNotes: "Progestogen for endometriosis-associated pain; depot provides sustained suppression. Monitor bone mineral density with prolonged depot use (>2 years). Fertility return may be delayed by up to 18 months after depot (NICE NG73 §1.4.3).",
    bnfReference: "BNF: Medroxyprogesterone acetate — sex hormones / progestogens / contraception",
  },
  "Triptorelin": {
    name: "Triptorelin",
    dose: "3.75 mg (monthly) or 11.25 mg (3-monthly depot)",
    route: "Intramuscular injection",
    frequency: "Monthly or 3-monthly depot",
    duration: "Maximum 6 months without add-back HRT; specialist oversight required",
    courseNotes: "GnRH agonist; mandatory add-back HRT (tibolone 2.5 mg OD or low-dose oestrogen + progestogen) to protect bone density. Baseline DEXA scan recommended if >6 months planned. Initiated by specialist only (NICE NG73 §1.4.4).",
    bnfReference: "BNF: Triptorelin — gonadotrophin-releasing hormone agonists",
  },
  "Tranexamic Acid": {
    name: "Tranexamic Acid",
    dose: "1 g",
    route: "Oral",
    frequency: "Three to four times daily during menstruation only",
    duration: "Maximum 4 days per cycle; start at onset of heavy bleeding",
    courseNotes: "Antifibrinolytic for heavy menstrual bleeding associated with endometriosis. Not hormonal — suitable when hormonal treatment declined. Review if no response after 3 cycles. Do not use with combined oral contraceptives (NICE NG73 §1.4.1).",
    bnfReference: "BNF: Tranexamic acid — haemostatics / menorrhagia",
  },
};

/**
 * Compute a recommended management plan based on BOTH clinical assessment AND investigation results.
 * NICE NG73: the management plan should be informed by clinical findings AND imaging results.
 */
export function computeManagementPlan(
  assessment: TriageInput,
  investigations: InvestigationResult
): ManagementPlanRecommendation {
  const deepEndoSuspected = assessment.bowelInvolvement || assessment.bladderInvolvement || assessment.uretericInvolvement;
  const deepEndoConfirmed = investigations.tvusDeepEndometriosis || investigations.mriDeepEndometriosis;
  const endometriomaPresent = investigations.tvusEndometrioma || investigations.mriEndometrioma;
  const tvusNormal = investigations.tvusNormal;
  const mriNormal = investigations.mriNormal;
  const adenomyosis = investigations.tvusAdenomyosis;
  const allImagingNormal = (tvusNormal || (investigations.tvusCompleted && !investigations.tvusEndometrioma && !investigations.tvusDeepEndometriosis && !investigations.tvusAdenomyosis)) &&
    (!investigations.mriCompleted || mriNormal);

  const reasons: string[] = [];
  let mdtRequired = false;
  let bsgeReferral = false;
  let avoidGnRH = false;
  let fertilityReferral = false;
  let painClinic = false;
  let psychSupport = false;

  let recommendedPathway: Pathway = "medical";

  if (deepEndoConfirmed || investigations.mriBowelInvolvement || investigations.mriBladderInvolvement || investigations.mriUretericInvolvement) {
    recommendedPathway = "surgery_specialist";
    reasons.push("Deep endometriosis confirmed on imaging (TVUS/MRI)");
    if (investigations.mriBowelInvolvement) reasons.push("MRI confirms bowel involvement");
    if (investigations.mriBladderInvolvement) reasons.push("MRI confirms bladder involvement");
    if (investigations.mriUretericInvolvement) reasons.push("MRI confirms ureteric involvement");
    if (investigations.tvusDeepEndometriosis) reasons.push("TVUS shows deep endometriosis");
    if (investigations.mriDeepEndometriosis) reasons.push("MRI confirms deep endometriosis");
    mdtRequired = true;
    bsgeReferral = true;
  } else if (adenomyosis) {
    recommendedPathway = "surgery_specialist";
    reasons.push("Adenomyosis detected on imaging: specialist gynaecology referral for treatment planning");
  } else if (investigations.laparoscopyCompleted && investigations.laparoscopyRafsStage) {
    const stage = investigations.laparoscopyRafsStage.toLowerCase();
    if (stage.includes("iv") || stage.includes("4")) {
      recommendedPathway = "surgery_specialist";
      reasons.push(`Laparoscopy confirms Stage IV endometriosis`);
      mdtRequired = true;
      bsgeReferral = true;
    } else if (stage.includes("iii") || stage.includes("3")) {
      recommendedPathway = "surgery_general";
      reasons.push(`Laparoscopy confirms Stage III endometriosis`);
    } else if (stage.includes("ii") || stage.includes("2")) {
      recommendedPathway = "medical";
      reasons.push("Laparoscopy confirms Stage II endometriosis: initial medical management");
    } else {
      recommendedPathway = "medical";
      reasons.push("Laparoscopy confirms Stage I endometriosis: medical management first-line");
    }
  } else if (assessment.negativeLaparoscopy && assessment.chronicPainPredominant) {
    recommendedPathway = "chronic_pain";
    reasons.push("Chronic pain predominant with negative laparoscopy");
    painClinic = true;
    psychSupport = true;
  } else if (assessment.chronicPainPredominant && assessment.symptomDurationMonths > 6 && !deepEndoSuspected && allImagingNormal) {
    recommendedPathway = "chronic_pain";
    reasons.push("Severe chronic pain not explained by imaging findings (normal TVUS/MRI)");
    painClinic = true;
    psychSupport = true;
  } else if (endometriomaPresent) {
    const largeEndometrioma = investigations.tvusEndometriomaSize && parseFloat(investigations.tvusEndometriomaSize) >= 3;
    if (largeEndometrioma) {
      recommendedPathway = "surgery_general";
      reasons.push("Endometrioma ≥3cm detected on imaging: surgical consideration");
    } else {
      recommendedPathway = "medical";
      reasons.push("Endometrioma <3cm detected: medical management first-line; monitor with repeat imaging");
    }
  } else if (assessment.previousTreatmentHistory && assessment.previousTreatmentHistory.toLowerCase().includes("failed") && !allImagingNormal) {
    // Treatment failed but imaging shows some findings
    recommendedPathway = "surgery_general";
    reasons.push("Previous medical treatment failed; imaging shows endometriosis findings");
  } else if (assessment.symptomsControlledOnMedication) {
    recommendedPathway = "medical";
    reasons.push("Symptoms well controlled on current medication: continue current regimen");
  } else if (assessment.symptomDurationMonths <= 6 && !assessment.previousSurgery) {
    // First presentation
    if (allImagingNormal) {
      recommendedPathway = "medical";
      reasons.push("First presentation with normal imaging: trial of medical management first-line (NICE NG73)");
    } else if (investigations.tvusCompleted && !investigations.tvusNormal) {
      recommendedPathway = "medical";
      reasons.push("First presentation with imaging findings: trial medical management first; reassess if symptoms persist");
    } else {
      recommendedPathway = "medical";
      reasons.push("First presentation: initial medical management first-line (NICE NG73)");
    }
  } else if (assessment.symptomDurationMonths > 6 && !assessment.symptomsControlledOnMedication && !allImagingNormal) {
    // Persistent symptoms, imaging abnormal
    recommendedPathway = "surgery_general";
    reasons.push("Persistent symptoms (≥6 months) not controlled by medical management with imaging findings");
  } else if (assessment.symptomDurationMonths > 6 && !assessment.symptomsControlledOnMedication && allImagingNormal) {
    // Persistent symptoms but normal imaging
    recommendedPathway = "medical";
    reasons.push("Persistent symptoms but normal imaging: continue medical management; consider pain clinic referral if severe");
    painClinic = true;
  } else {
    // Default
    recommendedPathway = "medical";
    reasons.push("Medical management first-line per NICE NG73 guidance");
  }

  if (assessment.fertilityPriority) {
    avoidGnRH = true;
    fertilityReferral = true;
    reasons.push("Fertility priority: avoid GnRH analogues/antagonists; consider fertility referral");
  }

  const pathwayRationale = reasons.join(" • ");

  // ── NICE NG73 Stepwise Treatment ──────────────────────────────────────────
  // Determine which step of the treatment ladder this patient is at.
  const hasPriorTreatment = !!(
    assessment.previousTreatmentHistory &&
    assessment.previousTreatmentHistory.trim().length > 0
  );
  const priorFailed =
    hasPriorTreatment &&
    assessment.previousTreatmentHistory!.toLowerCase().includes("fail");
  const isFirstPresentation =
    !hasPriorTreatment && assessment.symptomDurationMonths <= 6 && !assessment.previousSurgery;
  const persistentSymptoms = assessment.symptomDurationMonths > 6;
  const isSurgicalPathway =
    recommendedPathway === "surgery_specialist" || recommendedPathway === "surgery_general";

  let treatmentStep: TreatmentStep;
  let treatmentStepRationale: string;

  if (isSurgicalPathway) {
    // Surgical pathways skip the step ladder — surgery after imaging confirmation
    treatmentStep = 3;
    treatmentStepRationale =
      "Imaging findings indicate surgical management. Medical step-up is not appropriate; proceed to surgical planning after MDT/BSGE review as indicated (NICE NG73).";
  } else if (priorFailed || (hasPriorTreatment && persistentSymptoms)) {
    // Failed prior medical treatment or persistent despite treatment
    treatmentStep = 3;
    treatmentStepRationale =
      "Previous medical treatment has been tried and symptoms persist. Step 3 (specialist medical therapy or surgical referral) is indicated per NICE NG73.";
  } else if (hasPriorTreatment || persistentSymptoms) {
    // Has had some treatment OR symptoms >6 months — escalate to step 2
    treatmentStep = 2;
    treatmentStepRationale =
      "Symptoms have persisted beyond 6 months or a prior medical treatment has been used. Step 2 (second-line hormonal therapy) is indicated per NICE NG73.";
  } else {
    // First presentation, short symptom duration
    treatmentStep = 1;
    treatmentStepRationale =
      "First presentation with no prior medical treatment. Step 1 (first-line analgesia + hormonal therapy) is appropriate per NICE NG73.";
  }

  // ── Recommended medications per step ─────────────────────────────────────
  // Medication names match those in the medications table.
  let recommendedMedications: string[] = [];
  let medicationRationale: string;

  if (isSurgicalPathway) {
    // Pre-/post-operative hormonal suppression
    if (!assessment.fertilityPriority) {
      recommendedMedications = [
        "Norethisterone Acetate",
        "Combined Oral Contraceptive Pill",
      ];
      medicationRationale =
        "Pre-operative hormonal suppression to reduce disease activity (NICE NG73). Post-operatively, continuous hormonal therapy reduces recurrence risk.";
    } else {
      recommendedMedications = ["Norethisterone Acetate"];
      medicationRationale =
        "Norethisterone (progestogen) for hormonal suppression — safe with fertility priority; GnRH agents avoided (NICE NG73).";
    }
  } else if (treatmentStep === 1) {
    // Step 1: NSAIDs + hormonal first-line
    if (assessment.fertilityPriority) {
      // Avoid COC; use progestogen or IUS
      recommendedMedications = [
        "Naproxen",
        "Norethisterone Acetate",
        "Mirena IUS",
      ];
      medicationRationale =
        "Step 1 (NICE NG73): NSAID (Naproxen) for pain relief + progestogen (Norethisterone or Mirena IUS) as first-line hormonal therapy. Combined Oral Contraceptive avoided due to fertility priority.";
    } else {
      recommendedMedications = [
        "Naproxen",
        "Combined Oral Contraceptive Pill",
      ];
      medicationRationale =
        "Step 1 (NICE NG73): NSAID (Naproxen) for pain + Combined Oral Contraceptive Pill as first-line hormonal therapy. Review response at 3–6 months; escalate to Step 2 if insufficient.";
    }
  } else if (treatmentStep === 2) {
    // Step 2: second-line hormonal
    if (assessment.fertilityPriority) {
      // Avoid GnRH; Dienogest is evidence-based and fertility-sparing
      recommendedMedications = ["Dienogest", "Norethisterone Acetate"];
      medicationRationale =
        "Step 2 (NICE NG73): Dienogest (progestogen with endometriosis-specific evidence) as second-line therapy. GnRH analogues/antagonists avoided due to fertility priority.";
    } else {
      recommendedMedications = ["Dienogest", "Elagolix"];
      medicationRationale =
        "Step 2 (NICE NG73): Dienogest (progestogen) or Elagolix (GnRH antagonist) as second-line therapy. Elagolix has add-back oestrogen so bone loss risk is managed. Review at 6 months.";
    }
  } else {
    // Step 3: specialist / third-line
    if (assessment.fertilityPriority) {
      // GnRH agonist acceptable short-term pre-IVF; otherwise avoid
      recommendedMedications = ["Dienogest", "Leuprolide Acetate"];
      medicationRationale =
        "Step 3 (NICE NG73): Dienogest continued; short-course Leuprolide Acetate (GnRH agonist) acceptable pre-IVF for up to 3–6 months. Mandatory specialist review before GnRH agonist use.";
    } else {
      recommendedMedications = [
        "Leuprolide Acetate",
        "Relugolix/Estradiol/Norethindrone (Myfembree)",
      ];
      if (painClinic) {
        recommendedMedications.push("Gabapentin");
      }
      medicationRationale =
        "Step 3 (NICE NG73): GnRH agonist (Leuprolide Acetate) with add-back HRT (Relugolix combination) to protect bone density. Maximum 6-month course without add-back; use combined preparation. Specialist oversight required." +
        (painClinic ? " Gabapentin added for neuropathic/chronic pain component." : "");
    }
  }

  // ── Approach mapping ──────────────────────────────────────────────────────
  const recommendedApproach = pathwayToApproach(recommendedPathway);

  // ── Surgical options ──────────────────────────────────────────────────────
  const recommendedSurgicalOptions: string[] = [];
  if (isSurgicalPathway) {
    const deepEndoConfirmed2 =
      investigations.tvusDeepEndometriosis || investigations.mriDeepEndometriosis;
    const endometriomaPresent2 = investigations.tvusEndometrioma || investigations.mriEndometrioma;
    if (deepEndoConfirmed2) {
      recommendedSurgicalOptions.push("Laparoscopic excision of endometriosis");
      if (investigations.mriBowelInvolvement || investigations.mriUretericInvolvement) {
        recommendedSurgicalOptions.push("Adhesiolysis");
      }
    } else if (endometriomaPresent2) {
      recommendedSurgicalOptions.push("Ovarian cystectomy (endometrioma)");
      recommendedSurgicalOptions.push("Laparoscopic excision of endometriosis");
    } else if (investigations.tvusAdenomyosis) {
      recommendedSurgicalOptions.push("Laparoscopic excision of endometriosis");
    } else {
      recommendedSurgicalOptions.push("Laparoscopic excision of endometriosis");
    }
  }

  // ── Lifestyle recommendations ─────────────────────────────────────────────
  const recommendedLifestyle = [
    "Anti-inflammatory diet",
    "Regular low-impact exercise",
    "Heat therapy for pain management",
  ];
  if (painClinic || psychSupport || assessment.chronicPainPredominant) {
    recommendedLifestyle.push("Physiotherapy / pelvic floor therapy");
    recommendedLifestyle.push("Psychological support / counselling");
    recommendedLifestyle.push("Stress reduction techniques");
  }

  // ── Follow-up interval ────────────────────────────────────────────────────
  let recommendedFollowUpWeeks: number;
  if (treatmentStep === 3 || isSurgicalPathway || mdtRequired) {
    recommendedFollowUpWeeks = 6;
  } else if (treatmentStep === 2) {
    recommendedFollowUpWeeks = 12;
  } else {
    recommendedFollowUpWeeks = 16;
  }

  // ── Treatment goals ───────────────────────────────────────────────────────
  let recommendedGoals: string;
  if (isSurgicalPathway) {
    recommendedGoals =
      "Confirm extent of disease at laparoscopy; achieve complete excision of endometriotic lesions; relieve pelvic pain; restore normal anatomy; preserve fertility where applicable.";
  } else if (recommendedPathway === "chronic_pain") {
    recommendedGoals =
      "Reduce chronic pain to an acceptable level (VAS ≤4); improve daily functioning and quality of life; address central sensitisation via multidisciplinary pain programme; provide psychological support.";
  } else if (treatmentStep === 1) {
    recommendedGoals =
      "Reduce dysmenorrhoea and pelvic pain to VAS ≤3 within 3 months; maintain or improve quality of life; preserve fertility if applicable. Review at 3–6 months; escalate if insufficient response.";
  } else if (treatmentStep === 2) {
    recommendedGoals =
      "Achieve suppression of endometriosis-related pain on second-line therapy; review response at 6 months; consider surgical referral if medical management fails.";
  } else {
    recommendedGoals =
      "Specialist review to determine suitability for GnRH agonist therapy or surgical intervention; optimise quality of life; plan definitive management with MDT input as required.";
  }

  // ── BNF prescriptions ─────────────────────────────────────────────────────
  const prescriptions: PrescriptionItem[] = recommendedMedications
    .map((name) => BNF_DOSING[name])
    .filter((p): p is PrescriptionItem => !!p);

  // ── Surgical route determination ───────────────────────────────────────────
  let surgicalRoute: "pooled" | "specialist" | null = null;
  let surgicalRouteCriteria: string[] = [];
  if (isSurgicalPathway) {
    const surgTriage = computeSurgicalTriage(assessment, investigations);
    surgicalRoute = surgTriage.recommendedList;
    surgicalRouteCriteria = [
      ...surgTriage.pooledCriteria,
      ...surgTriage.specialistCriteria,
    ]
      .filter((c) => c.met)
      .map((c) => c.label);
  }

  return {
    recommendedPathway,
    pathwayRationale,
    mdtRequired,
    bsgeReferral,
    avoidGnRH,
    fertilityReferral,
    painClinic,
    psychSupport,
    treatmentStep,
    treatmentStepRationale,
    recommendedApproach,
    recommendedMedications,
    medicationRationale,
    prescriptions,
    recommendedSurgicalOptions,
    surgicalRoute,
    surgicalRouteCriteria,
    recommendedLifestyle,
    recommendedFollowUpWeeks,
    recommendedGoals,
  };
}

/**
 * Compute surgical list recommendation (Pooled vs Specialist) per NICE NG73 and UK pathways.
 *
 * NICE NG73 §1.5:
 *   - Pooled List (General Gynaecologist): peritoneal/superficial endo only; no deep endo on imaging;
 *     endometrioma <3cm without deep endo features; failed medical management
 *   - Specialist (BSGE Centre): deep endo ≥5mm below peritoneum; bowel/bladder/ureter involvement;
 *     large endometrioma with deep endo features; extrapelvic endo (diaphragmatic);
 *     recurrent after general surgery; hydronephrosis on imaging
 */
export function computeSurgicalTriage(
  assessment: TriageInput,
  investigations: InvestigationResult
): SurgicalTriageResult {
  const deepEndoSuspected = assessment.bowelInvolvement || assessment.bladderInvolvement || assessment.uretericInvolvement;
  const deepEndoConfirmed = investigations.tvusDeepEndometriosis || investigations.mriDeepEndometriosis;
  const endometriomaPresent = investigations.tvusEndometrioma || investigations.mriEndometrioma;
  const endometriomaSize = investigations.tvusEndometriomaSize
    ? parseFloat(investigations.tvusEndometriomaSize)
    : investigations.mriEndometrioma
    ? 3
    : 0;
  const largeEndometrioma = endometriomaSize >= 3;
  const hydronephrosis = investigations.hydronephrosis || investigations.mriUretericInvolvement; // explicit MRI flag or ureteric involvement tick
  const recurrentAfterGeneralSurgery = assessment.previousSurgery && deepEndoSuspected;
  const extrapelvicEndo = assessment.bowelInvolvement && investigations.mriBowelInvolvement;
  const superficialOnly =
    !deepEndoConfirmed &&
    !investigations.mriBowelInvolvement &&
    !investigations.mriBladderInvolvement &&
    !investigations.mriUretericInvolvement;
  const endometriomaSmallWithoutDeepFeatures = endometriomaPresent && !largeEndometrioma && !deepEndoConfirmed;
  const failedMedical =
    assessment.previousTreatmentHistory &&
    assessment.previousTreatmentHistory.toLowerCase().includes("fail");

  const pooledCriteria: SurgicalCriterion[] = [
    {
      label: "Peritoneal / superficial endometriosis only",
      criterion: "No deep endometriosis confirmed on imaging (TVUS/MRI)",
      source: "NICE NG73 §1.5",
      met: !!superficialOnly,
    },
    {
      label: "Endometrioma <3cm without deep features",
      criterion: "Endometrioma present but <3cm and no deep endometriosis signs",
      source: "NICE NG73 §1.5",
      met: !!endometriomaSmallWithoutDeepFeatures,
    },
    {
      label: "Failed medical management",
      criterion: "Previous medical treatment failed (e.g. hormonal therapy)",
      source: "NICE NG73 §1.5",
      met: !!failedMedical,
    },
  ];

  const specialistCriteria: SurgicalCriterion[] = [
    {
      label: "Deep infiltrating endometriosis (≥5mm)",
      criterion: "Deep endometriosis confirmed on MRI or TVUS (≥5mm below peritoneum)",
      source: "NICE NG73 §1.5",
      met: !!deepEndoConfirmed,
    },
    {
      label: "Bowel involvement",
      criterion: "MRI confirms bowel involvement or bowel involvement on clinical assessment",
      source: "NICE NG73 §1.5",
      met: !!(investigations.mriBowelInvolvement || (assessment.bowelInvolvement && investigations.mriCompleted)),
    },
    {
      label: "Bladder involvement",
      criterion: "MRI confirms bladder involvement or bladder involvement on clinical assessment",
      source: "NICE NG73 §1.5",
      met: !!(investigations.mriBladderInvolvement || (assessment.bladderInvolvement && investigations.mriCompleted)),
    },
    {
      label: "Ureteric involvement",
      criterion: "MRI confirms ureteric involvement or suspected hydronephrosis",
      source: "NICE NG73 §1.5",
      met: !!(investigations.mriUretericInvolvement || (assessment.uretericInvolvement && investigations.mriCompleted)),
    },
    {
      label: "Large endometrioma with deep endo features",
      criterion: "Endometrioma ≥3cm with deep endometriosis features on imaging",
      source: "NICE NG73 §1.5",
      met: !!(endometriomaPresent && largeEndometrioma && deepEndoConfirmed),
    },
    {
      label: "Extrapelvic / diaphragmatic endo",
      criterion: "Extra-pelvic endometriosis (e.g. diaphragmatic, bowel involvement)",
      source: "NICE NG73 §1.5",
      met: !!extrapelvicEndo,
    },
    {
      label: "Recurrent after general surgery",
      criterion: "Recurrence after previous surgery by general gynaecologist",
      source: "NICE NG73 §1.5",
      met: !!recurrentAfterGeneralSurgery,
    },
    {
      label: "Hydronephrosis on imaging",
      criterion: "Hydroureter or hydronephrosis identified on imaging",
      source: "NICE NG73 §1.5",
      met: !!hydronephrosis,
    },
  ];

  const matchedPooledCount = pooledCriteria.filter((c) => c.met).length;
  const matchedSpecialistCount = specialistCriteria.filter((c) => c.met).length;

  // Decision: ANY specialist criterion → specialist list
  // If ONLY pooled criteria met (and no specialist criteria) → pooled list
  // If no criteria met on either → medical management
  let recommendedList: SurgicalList;
  let recommendedListLabel: string;
  let recommendationRationale: string;
  let mdtRequired = false;
  let bsgeReferral = false;
  let surgeonGrade: string;
  let listStatus: string;

  if (matchedSpecialistCount > 0) {
    recommendedList = "specialist";
    recommendedListLabel = "Specialist (BSGE Centre)";
    mdtRequired = true;
    bsgeReferral = true;
    surgeonGrade = "Specialist Endometriosis Surgeon (BSGE Centre)";
    listStatus = "Specialist waiting list";
    const reasons = specialistCriteria
      .filter((c) => c.met)
      .map((c) => c.label);
    recommendationRationale =
      "This patient meets " +
      matchedSpecialistCount +
      " specialist criteria. NICE NG73 §1.5 mandates referral to a BSGE-accredited specialist endometriosis centre for deep infiltrating endometriosis, bowel/bladder/ureter involvement, large endometrioma with deep features, or recurrent disease after general surgery. Matched criteria: " +
      reasons.join("; ");
  } else if (matchedPooledCount > 0) {
    recommendedList = "pooled";
    recommendedListLabel = "Pooled (General Gynaecologist)";
    surgeonGrade = "General Gynaecologist";
    listStatus = "Pooled waiting list";
    const reasons = pooledCriteria.filter((c) => c.met).map((c) => c.label);
    recommendationRationale =
      "This patient meets " +
      matchedPooledCount +
      " pooled criteria. NICE NG73 §1.5 recommends pooled general gynaecological surgery list for peritoneal/superficial endometriosis, endometrioma <3cm without deep endometriosis features, or failed medical management. Matched criteria: " +
      reasons.join("; ");
  } else {
    // No surgical criteria met → medical management
    recommendedList = "pooled";
    recommendedListLabel = "Pooled (General Gynaecologist)";
    surgeonGrade = "General Gynaecologist";
    listStatus = "Pooled waiting list";
    recommendationRationale =
      "No definitive surgical criteria are met. NICE NG73 recommends first-line medical management for suspected endometriosis where surgery is not immediately indicated. If the patient is being referred for diagnostic laparoscopy, the general gynaecology list is appropriate.";
  }

  return {
    recommendedList,
    recommendedListLabel,
    recommendationRationale,
    pooledCriteria,
    specialistCriteria,
    matchedPooledCount,
    matchedSpecialistCount,
    mdtRequired,
    bsgeReferral,
    surgeonGrade,
    listStatus,
  };
}
