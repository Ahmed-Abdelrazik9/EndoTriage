import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const carePathwayEventsTable = pgTable("care_pathway_events", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  
  // Event type
  state: text("state").notNull(),
  // States:
  // referral_received, clinic_review, imaging_completed, triage_decision,
  // medication_started, medication_changed, waiting_list_added,
  // mdt_discussed, surgery_scheduled, surgery_completed, post_op_review,
  // follow_up_ongoing, recurrence_detected, discharged, long_term_management
  
  previousState: text("previous_state"),
  
  // Event details
  eventDate: text("event_date").notNull(),
  clinician: text("clinician"),
  notes: text("notes"),
  
  // Pathway context
  pathwayAssigned: text("pathway_assigned"), // medical, surgery_general, surgery_specialist, combined
  pathwayRationale: text("pathway_rationale"),
  
  // For surgery events
  surgeryId: integer("surgery_id"),
  
  // For medication events
  medicationName: text("medication_name"),
  medicationTier: text("medication_tier"),
  
  // For waiting list
  waitingListType: text("waiting_list_type"), // general_gynaecologist, specialist_bsge
  targetWaitWeeks: integer("target_wait_weeks"),
  
  // For MDT
  mdtSpecialties: text("mdt_specialties").notNull().default("[]"),
  mdtDecision: text("mdt_decision"),
  
  // For follow-up
  followUpType: text("follow_up_type"),
  followUpDate: text("follow_up_date"),
  
  // For discharge
  dischargeReason: text("discharge_reason"),
  dischargePlan: text("discharge_plan"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCarePathwayEventSchema = createInsertSchema(carePathwayEventsTable).omit({ id: true, createdAt: true });
export type InsertCarePathwayEvent = z.infer<typeof insertCarePathwayEventSchema>;
export type CarePathwayEvent = typeof carePathwayEventsTable.$inferSelect;

// Care pathway state lookup table
export const carePathwayStatesTable = pgTable("care_pathway_states", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().unique(),
  
  currentState: text("current_state").notNull().default("referral_received"),
  currentPathway: text("current_pathway"), // medical, surgery_general, surgery_specialist, combined
  
  // Key dates
  referralDate: text("referral_date"),
  clinicReviewDate: text("clinic_review_date"),
  triageDecisionDate: text("triage_decision_date"),
  medicationStartDate: text("medication_start_date"),
  waitingListDate: text("waiting_list_date"),
  surgeryDate: text("surgery_date"),
  postOpReviewDate: text("post_op_review_date"),
  lastFollowUpDate: text("last_follow_up_date"),
  dischargeDate: text("discharge_date"),
  
  // Next scheduled action
  nextActionDate: text("next_action_date"),
  nextActionType: text("next_action_type"),
  
  // BSGE centre
  bsgeCentre: text("bsge_centre"),
  
  // Fertility
  fertilityPriority: boolean("fertility_priority").notNull().default(false),
  fertilityClinicReferral: boolean("fertility_clinic_referral").notNull().default(false),
  
  // Pain clinic
  painClinicReferral: boolean("pain_clinic_referral").notNull().default(false),
  
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
});

export const insertCarePathwayStateSchema = createInsertSchema(carePathwayStatesTable).omit({ id: true, updatedAt: true });
export type InsertCarePathwayState = z.infer<typeof insertCarePathwayStateSchema>;
export type CarePathwayState = typeof carePathwayStatesTable.$inferSelect;
