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
  /** Company name, rendered as a coloured wordmark. */
  name: string;
  /** Short monogram shown in the logo tile. */
  monogram: string;
  /** Prominent placement tier — larger mark. MHA-curated, never paid (MVP). */
  featured?: boolean;
  /**
   * Renders a real brand SVG (from the shared brand registry) instead of a
   * monogram + coloured wordmark. The four real operator brands — "vendox",
   * "mha", "woodee", "wewe" — are the product owner's own logos (not invented);
   * see {@link BRAND_LOGOS}. Any other slug falls back to the wordmark path.
   */
  brandMark?: "vendox" | "mha" | "woodee" | "wewe" | string;
}

/**
 * The trusted-by entries. The first four — Vendox, MHA, Woodee, WEWE — are the
 * product owner's own, REAL brands (honest) and lead the band with their real
 * brand marks. The remainder are ~30 FICTIONAL companies (Malaysian/SEA mix)
 * used only to demonstrate the band; the section's "Illustrative preview" label
 * keeps the whole strip from being read as real adoption.
 */
export const TRUSTED_COMPANIES: TrustedCompany[] = [
  { name: "Vendox", monogram: "V", featured: true, brandMark: "vendox" },
  { name: "MHA", monogram: "MHA", featured: true, brandMark: "mha" },
  { name: "Woodee", monogram: "W", featured: true, brandMark: "woodee" },
  { name: "WEWE", monogram: "WE", featured: true, brandMark: "wewe" },
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
