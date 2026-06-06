import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const patientsTable = pgTable("patients", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  email: text("email"),
  phone: text("phone"),
  currentStage: text("current_stage"),
  triageLevel: text("triage_level"),
  lastAssessmentDate: text("last_assessment_date"),
  // Care pathway
  carePathwayState: text("care_pathway_state").notNull().default("referral_received"),
  currentPathway: text("current_pathway"), // medical, surgery_general, surgery_specialist, combined
  bsgeCentre: text("bsge_centre"),
  // Referral
  referralSource: text("referral_source"), // gp, self, a_e, fertility_clinic, other
  referralDate: text("referral_date"),
  // Fertility
  fertilityPriority: boolean("fertility_priority").notNull().default(false),
  // Notes
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
});

export const insertPatientSchema = createInsertSchema(patientsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patientsTable.$inferSelect;
