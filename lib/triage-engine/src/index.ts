export type TriageLevel = "urgent" | "high" | "moderate" | "routine";

export type Pathway =
  | "medical"
  | "surgery_general"
  | "surgery_specialist"
  | "chronic_pain"
  | "combined"
  | "watchful_waiting";

export interface PathwayResult {
  triageLevel: TriageLevel;
  triageScore: number;
  suggestedStage: string;
  suggestedPathway: Pathway;
  pathwayJustification: string;
  mdtRequired: boolean;
  bsgeReferral: boolean;
  mriRequired: boolean;
  avoidGnRH: boolean;
  fertilityReferral: boolean;
  painClinic: boolean;
  psychSupport: boolean;
}

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
  previousTreatmentHistory: string;
}

export function computeTriageAndStage(data: TriageInput): PathwayResult {
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

  let suggestedPathway: Pathway = "medical";
  const reasons: string[] = [];
  let mdtRequired = false;
  let bsgeReferral = false;
  let mriRequired = false;
  let avoidGnRH = false;
  let fertilityReferral = false;
  let painClinic = false;
  let psychSupport = false;

  if (deepEndoSuspected) {
    suggestedPathway = "surgery_specialist";
    reasons.push("Deep endometriosis suspected/confirmed");
    if (data.bowelInvolvement) reasons.push("Bowel involvement");
    if (data.bladderInvolvement) reasons.push("Bladder involvement");
    if (data.uretericInvolvement) reasons.push("Ureteric involvement");
    mdtRequired = true;
    bsgeReferral = true;
    mriRequired = true;
  } else if (data.negativeLaparoscopy && data.chronicPainPredominant) {
    suggestedPathway = "chronic_pain";
    reasons.push("Chronic pain predominant with negative laparoscopy");
    painClinic = true;
    psychSupport = true;
  } else if (data.chronicPainPredominant && score >= 45 && !deepEndoSuspected) {
    suggestedPathway = "chronic_pain";
    reasons.push("Severe chronic pain not explained by deep endometriosis");
    painClinic = true;
    psychSupport = true;
  } else if (persistentSymptoms && !deepEndoSuspected && !data.symptomsControlledOnMedication) {
    suggestedPathway = "surgery_general";
    reasons.push("Persistent symptoms not responding to medical management");
    reasons.push("No deep endometriosis on imaging");
  } else if (firstPresentation || data.symptomsControlledOnMedication) {
    suggestedPathway = "medical";
    if (firstPresentation) reasons.push("First presentation — initial medical management");
    if (data.symptomsControlledOnMedication) reasons.push("Symptoms controlled on current medication — continue");
  } else {
    suggestedPathway = "medical";
    reasons.push("Medical management recommended as first-line approach");
  }

  if (data.fertilityPriority) {
    avoidGnRH = true;
    fertilityReferral = true;
    reasons.push("Fertility priority — avoid GnRH analogues/antagonists, consider fertility referral");
  }

  if (data.previousSurgery && persistentSymptoms) {
    bsgeReferral = true;
    reasons.push("Recurrent symptoms after previous surgery — specialist review");
  }

  if (data.previousTreatmentHistory && data.previousTreatmentHistory.toLowerCase().includes("failed")) {
    if (suggestedPathway === "medical") {
      suggestedPathway = "surgery_general";
      reasons.push("Previous medical treatment failed — consider surgical option");
    } else if (suggestedPathway === "surgery_general") {
      suggestedPathway = "surgery_specialist";
      reasons.push("Failed previous surgery — specialist BSGE referral");
      mdtRequired = true;
      bsgeReferral = true;
    }
  }

  const pathwayJustification = reasons.join("; ");

  return {
    triageLevel,
    triageScore: score,
    suggestedStage,
    suggestedPathway,
    pathwayJustification,
    mdtRequired,
    bsgeReferral,
    mriRequired,
    avoidGnRH,
    fertilityReferral,
    painClinic,
    psychSupport,
  };
}
