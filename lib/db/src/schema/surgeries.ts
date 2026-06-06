import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const surgeriesTable = pgTable("surgeries", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  
  // Pre-operative
  plannedDate: text("planned_date"),
  actualDate: text("actual_date"),
  surgeon: text("surgeon"),
  surgeonGrade: text("surgeon_grade"), // consultant, senior_registrar, etc.
  centre: text("centre"), // hospital name
  bsgeAccredited: boolean("bsge_accredited").notNull().default(false),
  
  // Procedure details
  procedureType: text("procedure_type").notNull().default("laparoscopy"), // laparoscopy, laparotomy, combined
  procedureDetails: text("procedure_details").notNull().default("[]"),
  // Options: diagnostic_laparoscopy, laparoscopic_excision, laparoscopic_ablation,
  // ovarian_cystectomy, salpingo_oophorectomy, hysterectomy, adhesiolysis,
  // bowel_resection, bladder_resection, ureterolysis, presacral_neurectomy
  
  // Findings
  rafsStage: text("rafs_stage"), // Stage I, Stage II, Stage III, Stage IV
  enzianScore: text("enzian_score"),
  
  // Endometriosis locations
  locations: text("locations").notNull().default("[]"),
  // Options: peritoneal, ovarian_right, ovarian_left, ovarian_bilateral,
  // rectovaginal, bowel, bladder, ureteric, diaphragm, pelvic_sidewall
  
  // Endometrioma
  endometriomaPresent: boolean("endometrioma_present").notNull().default(false),
  endometriomaRight: boolean("endometrioma_right").notNull().default(false),
  endometriomaLeft: boolean("endometrioma_left").notNull().default(false),
  endometriomaRightSize: text("endometrioma_right_size"),
  endometriomaLeftSize: text("endometrioma_left_size"),
  
  // Deep infiltrating endometriosis
  deepEndometriosis: boolean("deep_endometriosis").notNull().default(false),
  deepEndometriosisLocation: text("deep_endometriosis_location"),
  
  // Adhesions
  adhesions: boolean("adhesions").notNull().default(false),
  adhesionsSeverity: text("adhesions_severity"), // mild, moderate, severe
  
  // Complications
  complications: boolean("complications").notNull().default(false),
  complicationsDetails: text("complications_details"),
  
  // Blood loss
  estimatedBloodLoss: text("estimated_blood_loss"),
  
  // Operative time
  operativeTime: text("operative_time"),
  
  // Histology
  histologyConfirmed: boolean("histology_confirmed").notNull().default(false),
  histologyDetails: text("histology_details"),
  
  // Post-operative plan
  postOpHormonalPlan: text("post_op_hormonal_plan"),
  followUpRequired: boolean("follow_up_required").notNull().default(true),
  followUpWeeks: integer("follow_up_weeks").notNull().default(6),
  
  // Outcome
  outcome: text("outcome"), // successful, partial, recurrence, complications
  
  // Consent
  consentObtained: boolean("consent_obtained").notNull().default(false),
  consentDate: text("consent_date"),
  
  // MDT
  mdtDiscussed: boolean("mdt_discussed").notNull().default(false),
  mdtDate: text("mdt_date"),
  
  // Notes
  preOpNotes: text("pre_op_notes"),
  intraOpNotes: text("intra_op_notes"),
  postOpNotes: text("post_op_notes"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
});

export const insertSurgerySchema = createInsertSchema(surgeriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSurgery = z.infer<typeof insertSurgerySchema>;
export type Surgery = typeof surgeriesTable.$inferSelect;
