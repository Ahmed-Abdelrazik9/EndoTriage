import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const managementPlansTable = pgTable("management_plans", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  assessmentId: integer("assessment_id"),
  status: text("status").notNull().default("active"),
  approach: text("approach"),
  medications: text("medications").notNull().default("[]"),
  surgicalOptions: text("surgical_options").notNull().default("[]"),
  lifestyleRecommendations: text("lifestyle_recommendations").notNull().default("[]"),
  followUpWeeks: integer("follow_up_weeks"),
  nextReviewDate: text("next_review_date"),
  goals: text("goals"),
  clinicianNotes: text("clinician_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
});

export const insertManagementPlanSchema = createInsertSchema(managementPlansTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertManagementPlan = z.infer<typeof insertManagementPlanSchema>;
export type ManagementPlan = typeof managementPlansTable.$inferSelect;
