/**
 * Synthetic "trusted by" companies for the homepage social-proof band.
 *
 * PROOF-OF-CONCEPT DATA ONLY. Per CLAUDE.md ("No fake live data or invented
 * proof") and AGENTS.md §8 (no "invented client logos, testimonials, awards,
 * placements"), these are FICTIONAL companies — not real clients or employers.
 * They exist solely to demonstrate the layout of the trusted-by band, and the
 * band always renders a visible "Illustrative preview" source label so it is
 * never presented as real adoption. Replace this list with real, permissioned
 * partner/employer logos (ideally data-driven from approved employers who opt
 * in) before any production use.
 *
 * The optional `featured` tier demonstrates how prominent placement could be
 * offered to partners. It is MHA-curated and carries NO payment logic: paid
 * featured listings / billing are an excluded MVP feature (spec §6.2). Tying
 * prominence to payment would also require honest "Featured partner" framing
 * kept distinct from organic "Trusted by".
 */
export interface TrustedCompany {
  /** Fictional company name, rendered as a wordmark. */
  name: string;
  /** Short monogram shown in the logo tile. */
  monogram: string;
  /** Prominent placement tier — larger mark. MHA-curated, never paid (MVP). */
  featured?: boolean;
}

/** ~30 fictional companies; a Malaysian/SEA mix to suit the platform's market. */
export const TRUSTED_COMPANIES: TrustedCompany[] = [
  { name: "Aurora Bank", monogram: "AB", featured: true },
  { name: "Summit Ventures", monogram: "SV" },
  { name: "Meridian Logistics", monogram: "ML", featured: true },
  { name: "Cyan Robotics", monogram: "CR" },
  { name: "Harborline Retail", monogram: "HR" },
  { name: "Northwind Energy", monogram: "NE", featured: true },
  { name: "Lumen Health", monogram: "LH" },
  { name: "Kuala Foundry", monogram: "KF" },
  { name: "Selasih Foods", monogram: "SF" },
  { name: "Tropikal Media", monogram: "TM" },
  { name: "Anggun Hospitality", monogram: "AH" },
  { name: "Cendana Capital", monogram: "CC", featured: true },
  { name: "Pulsar Telecom", monogram: "PT" },
  { name: "Verdant Agritech", monogram: "VA" },
  { name: "Straitline Shipping", monogram: "SS" },
  { name: "Orchid Pharma", monogram: "OP" },
  { name: "Bayu Aerospace", monogram: "BA" },
  { name: "Granite Construction", monogram: "GC" },
  { name: "Nimbus Cloud", monogram: "NC", featured: true },
  { name: "Teratai Insurance", monogram: "TI" },
  { name: "Equator Mining", monogram: "EM" },
  { name: "Saujana Resorts", monogram: "SR" },
  { name: "Delta Manufacturing", monogram: "DM" },
  { name: "Indah Property", monogram: "IP" },
  { name: "Quantum Analytics", monogram: "QA", featured: true },
  { name: "Mutiara Jewellers", monogram: "MJ" },
  { name: "Rimba Timber", monogram: "RT" },
  { name: "Solaris Power", monogram: "SP" },
  { name: "Helang Security", monogram: "HS" },
  { name: "Bintang Education", monogram: "BE" },
];
