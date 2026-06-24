/**
 * Synthetic testimonials for the homepage social-proof carousel.
 *
 * PROOF-OF-CONCEPT DATA ONLY. Per CLAUDE.md ("Do not fabricate … testimonials")
 * and AGENTS.md §8 (no "invented … testimonials"), these are FICTIONAL people
 * and companies — not real reviews. The carousel always renders an "Illustrative
 * preview" label, and there is deliberately NO aggregate rating badge (e.g.
 * "4.8 from 1.3K reviews"), which would imply a real metric. The per-quote star
 * value is part of the labelled illustration. Replace with genuine, consented
 * testimonials before any production use.
 *
 * `key` maps to copy under `home.testimonials.items.<key>` (quote + role) so the
 * user-facing text is translated (EN/zh-CN); names and companies are proper
 * nouns and stay as data (not auto-translated).
 */
export interface Testimonial {
  key: string;
  author: string;
  company: string;
  /** 1–5, illustrative only. */
  rating: number;
}

export const TESTIMONIALS: Testimonial[] = [
  { key: "talent", author: "Vera Lim", company: "Aurora Bank", rating: 5 },
  { key: "speed", author: "Daniel Tan", company: "Meridian Logistics", rating: 5 },
  { key: "support", author: "Arif Rahman", company: "Cendana Capital", rating: 4 },
  { key: "honest", author: "Mei Chong", company: "Nimbus Cloud", rating: 5 },
];
