import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const investigationsTable = pgTable("investigations", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  
  // Transvaginal Ultrasound
  tvusDate: text("tvus_date"),
  tvusRequested: boolean("tvus_requested").notNull().default(false),
  tvusCompleted: boolean("tvus_completed").notNull().default(false),
  tvusFindings: text("tvus_findings"),
  tvusEndometrioma: boolean("tvus_endometrioma").notNull().default(false),
  tvusEndometriomaSize: text("tvus_endometrioma_size"),
  tvusDeepEndometriosis: boolean("tvus_deep_endometriosis").notNull().default(false),
  tvusDeepEndometriosisLocation: text("tvus_deep_endometriosis_location"),
  tvusAdenomyosis: boolean("tvus_adenomyosis").notNull().default(false),
  tvusNormal: boolean("tvus_normal").notNull().default(false),
  tvusNotes: text("tvus_notes"),
  
  // MRI
  mriDate: text("mri_date"),
  mriRequested: boolean("mri_requested").notNull().default(false),
  mriCompleted: boolean("mri_completed").notNull().default(false),
  mriFindings: text("mri_findings"),
  mriDeepEndometriosis: boolean("mri_deep_endometriosis").notNull().default(false),
  mriDeepEndometriosisLocation: text("mri_deep_endometriosis_location"),
  mriEndometrioma: boolean("mri_endometrioma").notNull().default(false),
  mriEndometriomaSize: text("mri_endometrioma_size"),
  mriUretericInvolvement: boolean("mri_ureteric_involvement").notNull().default(false),
  mriBowelInvolvement: boolean("mri_bowel_involvement").notNull().default(false),
  mriBladderInvolvement: boolean("mri_bladder_involvement").notNull().default(false),
  mriNormal: boolean("mri_normal").notNull().default(false),
  mriNotes: text("mri_notes"),
  
  // Laparoscopy (diagnostic or surgical)
  laparoscopyDate: text("laparoscopy_date"),
  laparoscopyRequested: boolean("laparoscopy_requested").notNull().default(false),
  laparoscopyCompleted: boolean("laparoscopy_completed").notNull().default(false),
  laparoscopyType: text("laparoscopy_type"), // diagnostic, surgical, combined
  laparoscopyFindings: text("laparoscopy_findings"),
  laparoscopyRafsStage: text("laparoscopy_rafs_stage"),
  laparoscopyEnzianScore: text("laparoscopy_enzian_score"),
  laparoscopyLocations: text("laparoscopy_locations").notNull().default("[]"),
  laparoscopyComplications: text("laparoscopy_complications"),
  laparoscopyNotes: text("laparoscopy_notes"),
  
  // CA-125 (not recommended by NICE as diagnostic but tracked for historical use)
  ca125Date: text("ca125_date"),
  ca125Requested: boolean("ca125_requested").notNull().default(false),
  ca125Completed: boolean("ca125_completed").notNull().default(false),
  ca125Value: text("ca125_value"),
  ca125Notes: text("ca125_notes"),
  
  // Other bloods
  fbcDate: text("fbc_date"),
  fbcRequested: boolean("fbc_requested").notNull().default(false),
  fbcCompleted: boolean("fbc_completed").notNull().default(false),
  fbcNotes: text("fbc_notes"),
  
  // Clinician
  requestedBy: text("requested_by"),
  reviewedBy: text("reviewed_by"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
});

export const insertInvestigationSchema = createInsertSchema(investigationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInvestigation = z.infer<typeof insertInvestigationSchema>;
export type Investigation = typeof investigationsTable.$inferSelect;
