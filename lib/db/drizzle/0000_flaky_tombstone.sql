-- Remove suggested_pathway and pathway_justification from assessments table.
-- These columns are leftovers from the old pathway-first design where an assessment
-- directly determined a clinical pathway (A/B/C/D). The application no longer writes
-- or reads them; triage output is captured in triageLevel, triageScore, and the
-- individual boolean flags (bsgeReferral, painClinic, fertilityReferral, etc.).

ALTER TABLE "assessments" DROP COLUMN IF EXISTS "suggested_pathway";--> statement-breakpoint
ALTER TABLE "assessments" DROP COLUMN IF EXISTS "pathway_justification";
