import { pgTable, serial, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const medicationsTable = pgTable("medications", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  genericName: text("generic_name"),
  category: text("category").notNull(),
  mechanism: text("mechanism").notNull(),
  indications: text("indications").notNull(),
  contraindications: text("contraindications"),
  sideEffects: text("side_effects"),
  dosage: text("dosage"),
  approvedStages: text("approved_stages").notNull().default("[]"),
  evidenceLevel: text("evidence_level"),
  notes: text("notes"),
});

export const insertMedicationSchema = createInsertSchema(medicationsTable).omit({ id: true });
export type InsertMedication = z.infer<typeof insertMedicationSchema>;
export type Medication = typeof medicationsTable.$inferSelect;
