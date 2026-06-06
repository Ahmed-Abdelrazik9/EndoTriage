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
  recommendedSurgicalOptions: string[];
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

  const maxPain = Math.max(
    data.dysmenorrhea,
    data.chronicPelvicPain,
    data.dyspareunia,
    data.dyschezia,
    data.dysuria
  );
  score += maxPain * 2;
  score += data.impactOnQuality * 2;

  if (data.infertilityHistory) score += 15;
  if (data.previousSurgery) score += 10;
  if (data.familyHistory) score += 8;

  if (data.symptomDurationMonths > 24) score += 10;
  else if (data.symptomDurationMonths > 12) score += 6;
  else if (data.symptomDurationMonths > 6) score += 3;

  if (data.irregularBleeding) score += 5;
  if (data.bloating) score += 2;
  if (data.fatigue) score += 2;

  let triageLevel: TriageLevel;
  if (score >= 70) triageLevel = "urgent";
  else if (score >= 45) triageLevel = "high";
  else if (score >= 25) triageLevel = "moderate";
  else triageLevel = "routine";

  const severePain = data.dysmenorrhea >= 7 || data.chronicPelvicPain >= 7;
  const deepPain = data.dyspareunia >= 7 || data.dyschezia >= 7;

  let suggestedStage: string;
  if (score >= 70 || (severePain && deepPain && data.infertilityHistory)) {
    suggestedStage = "Stage IV";
  } else if (score >= 45 || (severePain && (data.infertilityHistory || data.previousSurgery))) {
    suggestedStage = "Stage III";
  } else if (score >= 25 || severePain) {
    suggestedStage = "Stage II";
  } else {
    suggestedStage = "Stage I";
  }

  const deepEndoSuspected = data.bowelInvolvement || data.bladderInvolvement || data.uretericInvolvement;
  const persistentSymptoms = data.symptomDurationMonths > 6 && (data.previousSurgery || score >= 25);
  const firstPresentation = data.symptomDurationMonths <= 6 && !data.previousSurgery;

  const investigations: InvestigationType[] = [];
  const reasons: string[] = [];

  let mdtRequired = false;
  let bsgeReferral = false;
  let mriRequired = false;
  let avoidGnRH = false;
  let fertilityReferral = false;
  let painClinic = false;
  let psychSupport = false;

  // NICE NG73: TVUS is first-line for all suspected endometriosis
  investigations.push("tvus");
  reasons.push("Transvaginal ultrasound is first-line imaging for all suspected endometriosis (NICE NG73)");

  if (deepEndoSuspected) {
    reasons.push("Deep endometriosis suspected: MRI required to assess extent of bowel, bladder, or ureteric involvement (NICE NG73)");
    investigations.push("mri");
    mriRequired = true;
    mdtRequired = true;
    bsgeReferral = true;
  }

  if (data.fertilityPriority) {
    avoidGnRH = true;
    fertilityReferral = true;
    reasons.push("Fertility priority: avoid GnRH analogues/antagonists; consider fertility referral (NICE NG73)");
  }

  if (data.negativeLaparoscopy && data.chronicPainPredominant) {
    painClinic = true;
    psychSupport = true;
    reasons.push("Chronic pain predominant with negative laparoscopy: consider pain clinic and psychological support (NICE NG73)");
  }

  if (data.chronicPainPredominant && score >= 45 && !deepEndoSuspected) {
    painClinic = true;
    psychSupport = true;
    reasons.push("Severe chronic pain without deep endometriosis: multidisciplinary pain management and psychological support (NICE NG73)");
  }

  if (data.previousSurgery && persistentSymptoms) {
    bsgeReferral = true;
    reasons.push("Recurrent symptoms after previous surgery: specialist BSGE review recommended (NICE NG73)");
  }

  if (data.previousTreatmentHistory && data.previousTreatmentHistory.toLowerCase().includes("failed")) {
    reasons.push("Previous medical treatment failed: surgical evaluation may be indicated after imaging (NICE NG73)");
  }

  if (data.infertilityHistory && data.fertilityPriority) {
    investigations.push("fbc");
    reasons.push("Infertility assessment: baseline FBC and other hormonal workup recommended");
  }

  // CA-125 is not recommended by NICE as diagnostic for endometriosis, but we track it
  // (not added to investigations list as NICE explicitly does not recommend it)

  const investigationRationale = reasons.join("\u2022 ");

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
    recommendedSurgicalOptions,
    recommendedLifestyle,
    recommendedFollowUpWeeks,
    recommendedGoals,
  };
}
