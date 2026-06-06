import { pgTable, serial, text, boolean } from "drizzle-orm/pg-core";
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
  // NICE/UK tier system
  tier: text("tier").notNull().default("tier1"), // tier1 (first-line), tier2 (second-line), tier3 (specialist), analgesia
  formularyStatus: text("formulary_status").notNull().default("green"), // green, amber, red
  formularyNotes: text("formulary_notes"), // e.g. "AMBER 0 - specialist initiation"
  niceTa: text("nice_ta"), // e.g. "TA1057"
  niceApproved: boolean("nice_approved").notNull().default(false),
  notes: text("notes"),
});

export const insertMedicationSchema = createInsertSchema(medicationsTable).omit({ id: true });
export type InsertMedication = z.infer<typeof insertMedicationSchema>;
export type Medication = typeof medicationsTable.$inferSelect;
