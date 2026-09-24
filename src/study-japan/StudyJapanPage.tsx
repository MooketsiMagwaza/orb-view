import { useState } from "react";
import { OrbGlyph } from "../paths/OrbGlyph";
import { hrefFor } from "../library/route";
import { MEXT_CATEGORIES, STAGES, type MextCategory, type Stage } from "./mext-categories";

function CategoryCard({ category, dimmed }: { category: MextCategory; dimmed: boolean }) {
  return (
    <div className={`jp-category${dimmed ? " is-dimmed" : ""}`}>
      <h3>{category.title}</h3>
      <p className="jp-category__level">{category.level}</p>
      <dl className="jp-category__facts">
        <div><dt>Age limit</dt><dd>{category.ageLimit}</dd></div>
        <div><dt>Stipend</dt><dd>{category.stipend}</dd></div>
        <div><dt>Duration</dt><dd>{category.duration}</dd></div>
        <div><dt>Route</dt><dd>{category.routes}</dd></div>
        <div><dt>Exams</dt><dd>{category.exams}</dd></div>
      </dl>
      {category.note && <p className="jp-category__note">{category.note}</p>}
    </div>
  );
}

function CategoryMatcher() {
  const [stage, setStage] = useState<Stage | null>(null);
  return (
    <>
      <div className="jp-stage-picker" role="group" aria-label="Filter by where you are now">
        <button type="button" className={`chip-filter${!stage ? " is-on" : ""}`} onClick={() => setStage(null)}>All seven</button>
        {STAGES.map((s) => (
          <button key={s.id} type="button" className={`chip-filter${stage === s.id ? " is-on" : ""}`} onClick={() => setStage(stage === s.id ? null : s.id)}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="jp-categories">
        {MEXT_CATEGORIES.map((c) => <CategoryCard key={c.id} category={c} dimmed={!!stage && !c.stages.includes(stage)} />)}
      </div>
    </>
  );
}

/**
 * A standalone guide, not a concept page: MEXT scholarship categories, the embassy vs. university
 * application routes, prerequisites, and how the application year typically unfolds. Figures here
 * are cross-checked against official sources as of September 2026 but MEXT revises amounts and
 * deadlines most years — the Sources section at the end links to where to confirm the current ones.
 */
export function StudyJapanPage() {
  return (
    <article className="page study-japan-page">
      <nav className="crumbs" aria-label="Where this lives">
        <a href={hrefFor({ kind: "library" })}>Library</a><span aria-hidden="true">›</span>
        <strong aria-current="page">Studying in Japan</strong>
      </nav>

      <header className="page__head">
        <OrbGlyph state="searching" voice="layered" seed="study-japan-guide" size={72} />
        <div className="page__heading">
          <p className="eyebrow">Me</p>
          <h1 className="page__title">Studying in Japan</h1>
        </div>
        <div className="page__actions"><a className="pill" href={hrefFor({ kind: "map", id: "study-in-japan" })}>See the Journey as a Map</a></div>
      </header>
      <p className="page__lede">A practical guide to the main ways in, with MEXT scholarship categories and their prerequisites, the two application routes, and how the application year actually unfolds. The same journey, as a chain from decision to arrival, is mapped out in the library — this page is the detailed reference to check against it. Written as a reference to work from, not a substitute for the official guidelines linked at the end.</p>

      <section className="page__section" aria-labelledby="paths">
        <h2 id="paths">The main paths in</h2>
        <p className="page__note">Four routes cover most people. The <strong>MEXT scholarship</strong> is the Japanese government's own award: fully funded, competitive, and applied for either through a Japanese embassy or through a partner university abroad. <strong>JASSO</strong> and university-specific scholarships are smaller top-ups for students who get themselves admitted first, as privately-financed students, and are then nominated for extra funding. Fully <strong>self-funded</strong> study, often via a year or two at a Japanese language school while preparing for the EJU, remains the most common path overall. And a growing number of universities run <strong>English-taught degree programs</strong> that need little or no Japanese at entry.</p>
      </section>

      <section className="page__section" aria-labelledby="mext-categories">
        <h2 id="mext-categories">MEXT scholarship: the seven categories</h2>
        <p className="page__note">MEXT scholarships all waive tuition and entrance fees and provide a round-trip economy flight, on top of the monthly stipend below. Pick a stage below to see which categories usually fit it.</p>
        <CategoryMatcher />
      </section>

      <section className="page__section" aria-labelledby="routes">
        <h2 id="routes">Two ways in: embassy vs. university recommendation</h2>
        <div className="jp-route-compare">
          <div className="jp-route">
            <h3>Embassy recommendation</h3>
            <p>Apply directly through the Japanese embassy or consulate in the country where you hold citizenship. The embassy runs the first screening, written exams, and an interview, then recommends a shortlist to MEXT, which places successful candidates with a university. Open to all seven categories, but it's the slower, more competitive route, and takes most of a year end to end.</p>
          </div>
          <div className="jp-route">
            <h3>University recommendation</h3>
            <p>Available only through Japanese universities that MEXT has approved to nominate candidates directly (Research, Undergraduate, Japanese Studies, and College of Technology categories). The university screens you itself, so there's no embassy exam, and, once nominated, only MEXT's final approval stands between you and the scholarship — faster, but the deadline, required documents, and available fields depend entirely on that one university's own process.</p>
          </div>
        </div>
      </section>

      <section className="page__section" aria-labelledby="prereqs">
        <h2 id="prereqs">Prerequisites, before the paperwork starts</h2>
        <ul className="jp-checklist">
          <li><strong>Nationality</strong> — your country must have diplomatic relations with Japan; dual Japanese nationals aren't eligible unless they renounce Japanese citizenship.</li>
          <li><strong>Age and academic background</strong> — set per category above; undergraduate and vocational routes usually want a completed or nearly-completed high school diploma, research and teacher-training routes want a bachelor's (or 16 years of schooling) already in hand.</li>
          <li><strong>Health</strong> — good physical and mental health, backed by a medical certificate on a MEXT-provided form.</li>
          <li><strong>Language</strong> — MEXT doesn't require a Japanese certificate to apply for most categories, since undergraduate and research grantees typically get a preparatory year of intensive Japanese first. English-taught ("G30"-style) programs and some university-recommendation routes instead want proof of English, often CEFR B2 or a TOEFL/IELTS score.</li>
          <li><strong>Two recommendation letters</strong> — usually from a teacher, professor, or employer, written in English or Japanese.</li>
          <li><strong>A research plan or statement of purpose</strong> — required for Research Students especially; the more concrete and matched to a specific supervisor's work, the stronger the application.</li>
          <li><strong>Transcripts and certificates</strong> — officially translated if not already in English or Japanese.</li>
        </ul>
      </section>

      <section className="page__section" aria-labelledby="timeline">
        <h2 id="timeline">How the application year unfolds</h2>
        <p className="page__note">This is the recurring shape of the <em>embassy</em> route's calendar year, not fixed dates — exact deadlines are set independently by each embassy and shift slightly each year. University recommendation runs on that institution's own, usually faster, schedule.</p>
        <ol className="jp-timeline">
          <li><strong>~April</strong> — MEXT publishes that year's guidelines; embassies open applications.</li>
          <li><strong>~April–June</strong> — you submit your application at the embassy or consulate in your home country. Confirm the exact local deadline directly; it varies by country.</li>
          <li><strong>~June–July</strong> — written exams (Japanese, English, and any subject exams for your category) and an interview at the embassy.</li>
          <li><strong>~August–September</strong> — the embassy notifies you whether you've been recommended to MEXT.</li>
          <li><strong>~October–November</strong> — MEXT finalizes its list of grantees from the embassies' recommendations.</li>
          <li><strong>~November–February</strong> — MEXT and JASSO place you with a host university, which issues a Certificate of Eligibility for your visa.</li>
          <li><strong>Following April</strong> — you depart for Japan; a Japanese-language preparatory course often begins before your actual studies do.</li>
        </ol>
      </section>

      <section className="page__section" aria-labelledby="exams">
        <h2 id="exams">The exams you'll hear about: JLPT and EJU</h2>
        <p className="page__note">
          The <strong>JLPT</strong> (Japanese-Language Proficiency Test) measures general Japanese ability on five levels, N5 (basic) up to N1 (near-native); N2 is the level most Japanese-taught humanities and social-science programs expect by the time your actual coursework starts, though not necessarily at application.
          <br /><br />
          The <strong>EJU</strong> (Examination for Japanese University Admission for International Students) is the standard undergraduate admissions test itself, used by nearly all national and most private universities in place of a JLPT certificate: it tests Japanese as an academic language alongside science, math, or "Japan and the world," chosen to match your intended major. It's held twice a year, in June and November, both in Japan and at test centers abroad.
        </p>
      </section>

      <section className="page__section" aria-labelledby="money">
        <h2 id="money">Money and work, in practice</h2>
        <p className="page__note">The stipend covers a modest student life, rent, food, utilities, local transport, comfortably in most cities and more tightly in central Tokyo. A regional supplement of ¥2,000–3,000/month applies in certain designated areas. Tuition, entrance fees, and examination fees are waived for MEXT scholars, and one round-trip economy flight is provided. Part-time work is allowed on a student visa, up to 28 hours a week during term and 40 during official school breaks, but it needs a specific permit (資格外活動許可, "permission for activity beyond your status of residence"), obtained at the airport on arrival or at a local immigration office — working without it risks the visa itself.</p>
      </section>

      <section className="page__section" aria-labelledby="beyond">
        <h2 id="beyond">Beyond MEXT</h2>
        <ul className="jp-checklist">
          <li><strong>JASSO Honors Scholarship</strong> — a top-up for privately-financed students already admitted to a Japanese institution, nominated by that institution: about ¥48,000/month at university level or ¥30,000/month at a language school, for a period the school sets.</li>
          <li><strong>JASSO's EJU Reservation Program</strong> — reserves a JASSO scholarship in advance for students who score well on the EJU and plan to enroll as privately-financed students.</li>
          <li><strong>University-specific scholarships and tuition waivers</strong> — worth checking directly on each university's own site; terms vary widely.</li>
          <li><strong>Private and foundation scholarships</strong> — Rotary Yoneyama, the Honjo International Scholarship Foundation, prefectural and city scholarships, and sponsorship from an employer or your own government.</li>
        </ul>
      </section>

      <section className="page__section" aria-labelledby="botswana">
        <h2 id="botswana">Applying from Botswana</h2>
        <p className="page__note">The channels below are specific to applicants holding Botswana citizenship. As everywhere, confirm current details directly before applying — the links are in the Sources section below.</p>
        <ul className="jp-checklist">
          <li><strong>The Embassy of Japan in Gaborone</strong> runs the embassy-recommendation route for Botswana: it has published Research Student, Undergraduate, and (in some years) Teacher Training openings, and handles the exams and interview locally. Questions go to its Culture and Information Section at <a href="mailto:culture-pr@gr.mofa.go.jp">culture-pr@gr.mofa.go.jp</a>, with "Question for MEXT Scholarships" in the subject line.</li>
          <li><strong>DTEF</strong> (the Department of Tertiary Education Financing, under Botswana's own Ministry of Tertiary Education) is a separate, means-tested government sponsorship for tertiary study, including some study abroad. It's a fallback or complement for the self-funded path, not a substitute for MEXT, since MEXT already covers tuition and living costs directly.</li>
          <li><strong>The ABE Initiative</strong>, run by JICA rather than MEXT, is a two-year master's-plus-internship program open to African nationals generally, including Batswana: under 40, a bachelor's degree and relevant work experience required, and it can't be combined with another scholarship. A genuinely separate program worth comparing against MEXT's Research Student category.</li>
          <li><strong>Akita University</strong> holds cooperation agreements with both the University of Botswana and the Botswana International University of Science and Technology, which has in the past supported exchange and scholarship pathways between the two countries directly through those institutions — worth asking about at either university alongside the embassy route.</li>
        </ul>
      </section>

      <section className="page__section jp-sources" aria-labelledby="sources">
        <h2 id="sources">Sources, and a caution</h2>
        <p className="page__note">MEXT revises stipend amounts, age cutoffs, and deadlines most fiscal years, and deadlines vary by country even within one year. Treat everything above as what to expect, and confirm the current numbers directly before you apply:</p>
        <ul className="jp-checklist">
          <li><a href="https://www.studyinjapan.go.jp/en/planning/scholarships/mext-scholarships/" target="_blank" rel="noreferrer">Study in Japan — MEXT Scholarships overview</a></li>
          <li><a href="https://www.mext.go.jp/en/policy/education/highered/title02/detail02/sdetail02/1373897.htm" target="_blank" rel="noreferrer">MEXT — official Study in Japan scholarship portal</a></li>
          <li><a href="https://www.mext.go.jp/content/20260420-mxt-kotokoku01-000049243_02.pdf" target="_blank" rel="noreferrer">MEXT — full application guidelines PDF (2027 intake)</a></li>
          <li><a href="https://www.jasso.go.jp/en/ryugaku/scholarship_j/index.html" target="_blank" rel="noreferrer">JASSO — scholarships for study in Japan</a></li>
          <li><a href="https://www.jasso.go.jp/en/ryugaku/eju/index.html" target="_blank" rel="noreferrer">JASSO — the EJU exam</a></li>
          <li><a href="https://www.botswana.emb-japan.go.jp/itpr_en/scholarships.html" target="_blank" rel="noreferrer">Embassy of Japan in Botswana — scholarships and application forms</a></li>
          <li><a href="https://www.gov.bw/bursaries-and-scholarships/tertiary-education-students-sponsorship" target="_blank" rel="noreferrer">Government of Botswana — DTEF tertiary education sponsorship</a></li>
          <li>Your own country's Japanese embassy or consulate website, for the actual local deadline and document list.</li>
        </ul>
      </section>
    </article>
  );
}
