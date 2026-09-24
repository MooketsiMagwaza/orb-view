/**
 * MEXT (Monbukagakusho) scholarship categories. Figures cross-checked against studyinjapan.go.jp,
 * the official MEXT application guidelines, and several Japanese embassy pages as of September 2026.
 * MEXT revises stipend amounts, age cutoffs, and deadlines most years — treat these as "what to expect,"
 * not the current year's exact numbers, and confirm both against the guide's Sources section before applying.
 */
export type Stage = "high-school" | "bachelor-grad" | "japanese-studies-major" | "teacher" | "professional" | "vocational";

export type MextCategory = {
  id: string;
  title: string;
  level: string;
  ageLimit: string;
  stipend: string;
  duration: string;
  routes: string;
  exams: string;
  stages: Stage[];
  note?: string;
};

export const STAGES: { id: Stage; label: string }[] = [
  { id: "high-school", label: "Finishing high school" },
  { id: "bachelor-grad", label: "Have (or finishing) a bachelor's" },
  { id: "japanese-studies-major", label: "Majoring in Japanese abroad" },
  { id: "teacher", label: "A teacher, 5+ years in" },
  { id: "professional", label: "An experienced professional" },
  { id: "vocational", label: "Want a technical/vocational diploma" },
];

export const MEXT_CATEGORIES: MextCategory[] = [
  { id: "undergraduate", title: "Undergraduate Students", level: "Undergraduate degree, from year one",
    ageLimit: "Typically 17–24 (the exact cutoff shifts slightly year to year)",
    stipend: "¥117,000/month", duration: "Degree length plus a year of Japanese language preparation (about 5 years total; 7 for medicine, dentistry, pharmacy, or veterinary science)",
    routes: "Embassy or university recommendation", exams: "Japanese, English, and math/science matched to your intended major",
    stages: ["high-school"] },
  { id: "research", title: "Research Students", level: "Graduate: master's, doctoral, or non-degree research",
    ageLimit: "Under 35",
    stipend: "¥143,000/month (non-degree) · ¥144,000 (master's) · ¥145,000 (doctoral)", duration: "Usually 2 years, often preceded by up to 6 months of Japanese language study",
    routes: "Embassy or university recommendation", exams: "Japanese and English (specifics vary by field and host university)",
    stages: ["bachelor-grad"] },
  { id: "japanese-studies", title: "Japanese Studies Students", level: "Non-degree, for students of Japanese language or culture",
    ageLimit: "18–29",
    stipend: "¥117,000/month", duration: "1 academic year",
    routes: "Embassy recommendation, through your home university's Japanese-studies program", exams: "Japanese only",
    stages: ["japanese-studies-major"], note: "You must already be enrolled in a Japanese-language or Japanese-culture major outside Japan to apply." },
  { id: "teacher-training", title: "Teacher Training Students", level: "Non-degree, in-service teacher training",
    ageLimit: "Under 35, plus 5+ years of teaching experience",
    stipend: "¥117,000/month", duration: "1 year 6 months, including Japanese language study",
    routes: "Embassy recommendation only", exams: "Japanese and English",
    stages: ["teacher"] },
  { id: "ylp", title: "Young Leaders Program (YLP)", level: "Graduate (master's), for working professionals",
    ageLimit: "Under 40, with relevant work experience",
    stipend: "Comparable to the Research Student rate; confirm the current figure with the nominating body", duration: "About 1 year",
    routes: "Only through designated partner organizations and ministries overseas — not open to individual applicants", exams: "Run by the nominating organization, not a public exam",
    stages: ["professional"], note: "There is no direct-application route: you're nominated by an employer, ministry, or partner institution in your home country." },
  { id: "college-of-technology", title: "College of Technology Students", level: "Enters year 3 of a 5-year technical college (kōsen) program",
    ageLimit: "Under 25",
    stipend: "¥117,000/month", duration: "About 4 years, including Japanese language preparation",
    routes: "Embassy or university recommendation", exams: "Japanese, English, math, and physics or chemistry",
    stages: ["vocational"] },
  { id: "specialized-training", title: "Specialized Training College Students", level: "2–3 year vocational/technical diploma",
    ageLimit: "Under 25",
    stipend: "¥117,000/month", duration: "About 3 years, including Japanese language preparation",
    routes: "Embassy recommendation", exams: "Japanese, English, math",
    stages: ["vocational"] },
];
