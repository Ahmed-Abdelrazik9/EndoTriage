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
  suggestedStage: text("suggested_stage"),
  triageLevel: text("triage_level").notNull().default("routine"),
  triageScore: integer("triage_score").notNull().default(0),
  clinicianNotes: text("clinician_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAssessmentSchema = createInsertSchema(assessmentsTable).omit({ id: true, createdAt: true });
export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type Assessment = typeof assessmentsTable.$inferSelect;
