import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const assessmentsTable = pgTable("assessments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  assessmentDate: text("assessment_date").notNull(),
  dysmenorrhea: integer("dysmenorrhea").notNull().default(0),
  chronicPelvicPain: integer("chronic_pelvic_pain").notNull().default(0),
  dyspareunia: integer("dyspareunia").notNull().default(0),
  dyschezia: integer("dyschezia").notNull().default(0),
  dysuria: integer("dysuria").notNull().default(0),
  infertilityHistory: boolean("infertility_history").notNull().default(false),
  previousSurgery: boolean("previous_surgery").notNull().default(false),
  familyHistory: boolean("family_history").notNull().default(false),
  symptomDurationMonths: integer("symptom_duration_months").notNull().default(0),
  impactOnQuality: integer("impact_on_quality").notNull().default(0),
  irregularBleeding: boolean("irregular_bleeding").notNull().default(false),
  bloating: boolean("bloating").notNull().default(false),
  fatigue: boolean("fatigue").notNull().default(false),
  // Deep endometriosis indicators
  bowelInvolvement: boolean("bowel_involvement").notNull().default(false),
  bladderInvolvement: boolean("bladder_involvement").notNull().default(false),
  uretericInvolvement: boolean("ureteric_involvement").notNull().default(false),
  // Pathway modifiers
  fertilityPriority: boolean("fertility_priority").notNull().default(false),
  negativeLaparoscopy: boolean("negative_laparoscopy").notNull().default(false),
  chronicPainPredominant: boolean("chronic_pain_predominant").notNull().default(false),
  symptomsControlledOnMedication: boolean("symptoms_controlled_on_medication").notNull().default(false),
  previousTreatmentHistory: text("previous_treatment_history"),
  // Computed results
  suggestedStage: text("suggested_stage"),
  triageLevel: text("triage_level").notNull().default("routine"),
  triageScore: integer("triage_score").notNull().default(0),
  suggestedPathway: text("suggested_pathway"),
  pathwayJustification: text("pathway_justification"),
  mdtRequired: boolean("mdt_required").notNull().default(false),
  bsgeReferral: boolean("bsge_referral").notNull().default(false),
  mriRequired: boolean("mri_required").notNull().default(false),
  avoidGnRH: boolean("avoid_gnrh").notNull().default(false),
  fertilityReferral: boolean("fertility_referral").notNull().default(false),
  painClinic: boolean("pain_clinic").notNull().default(false),
  psychSupport: boolean("psych_support").notNull().default(false),
  clinicianNotes: text("clinician_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAssessmentSchema = createInsertSchema(assessmentsTable).omit({ id: true, createdAt: true });
export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type Assessment = typeof assessmentsTable.$inferSelect;
