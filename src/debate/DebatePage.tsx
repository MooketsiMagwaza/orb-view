import { useMemo, useState } from "react";
import { getNode } from "../graph/model";
import { OrbGlyph } from "../paths/OrbGlyph";
import { hrefFor } from "../library/route";
import { quiz, type QuizItem } from "./fallacy-quiz";

/** A small link back into the library, styled like the chips on a concept page. */
function TopicLink({ id }: { id: string }) {
  const node = getNode(id);
  return (
    <a className="chip" href={hrefFor({ kind: "concept", id })} style={{ "--tone": node.tone.blue } as React.CSSProperties}>
      <i className="chip__dot" aria-hidden="true" />{node.title}
    </a>
  );
}

function TopicList({ ids }: { ids: string[] }) {
  return (
    <ul className="chips">
      {ids.map((id) => <li key={id}><TopicLink id={id} /></li>)}
    </ul>
  );
}

/** One family of fallacies: its own short explanation, plus a link to every member. */
function FallacyFamily({ id, blurb, members }: { id: string; blurb: string; members: string[] }) {
  const node = getNode(id);
  return (
    <div className="debate-family">
      <h3><a href={hrefFor({ kind: "concept", id })}>{node.title}</a></h3>
      <p>{blurb}</p>
      <TopicList ids={members} />
    </div>
  );
}

const FAMILIES: { id: string; blurb: string; members: string[] }[] = [
  { id: "formal-fallacies", blurb: "The logical shape itself is broken: the conclusion doesn't actually follow, whatever the premises mean.",
    members: ["affirming-consequent", "denying-antecedent", "undistributed-middle", "conjunction-fallacy", "argument-from-fallacy"] },
  { id: "fallacies-of-relevance", blurb: "The response has nothing to do with the argument, or attacks the person making it instead of the claim.",
    members: ["ad-hominem", "straw-man", "red-herring", "tu-quoque", "whataboutism", "genetic-fallacy"] },
  { id: "fallacious-appeals", blurb: "The claim leans on authority, popularity, emotion, or tradition instead of evidence.",
    members: ["appeal-to-authority", "appeal-to-emotion", "appeal-to-nature", "appeal-to-tradition", "appeal-to-novelty", "bandwagon", "appeal-to-ignorance", "appeal-to-consequences"] },
  { id: "fallacies-of-presumption", blurb: "The argument quietly assumes something it should have had to prove first.",
    members: ["begging-the-question", "false-dilemma", "loaded-question", "no-true-scotsman", "moving-goalposts", "equivocation", "false-equivalence", "middle-ground"] },
  { id: "fallacies-of-causation", blurb: "A link between cause and effect is claimed that the evidence doesn't actually support.",
    members: ["post-hoc", "correlation-causation", "causal-oversimplification", "slippery-slope"] },
  { id: "fallacies-of-evidence", blurb: "The evidence itself is too little, too selective, or simply misread.",
    members: ["hasty-generalization", "anecdotal-evidence", "cherry-picking", "survivorship-bias", "texas-sharpshooter", "gamblers-fallacy", "base-rate-fallacy", "composition-division"] },
];

function shuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let s = seed;
  const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function Question({ item, index, total, onAnswered }: { item: QuizItem; index: number; total: number; onAnswered: (correct: boolean) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const options = useMemo(() => shuffle([item.correct, ...item.distractors], index * 97 + item.prompt.length), [item, index]);

  const choose = (id: string) => {
    if (picked) return;
    setPicked(id);
    onAnswered(id === item.correct);
  };

  return (
    <div className="quiz-card">
      <p className="quiz-card__progress">Question {index + 1} of {total}</p>
      <p className="quiz-card__prompt">{item.prompt}</p>
      <div className="quiz-card__options">
        {options.map((id) => {
          const node = getNode(id);
          const state = !picked ? "" : id === item.correct ? " is-correct" : id === picked ? " is-wrong" : " is-faded";
          return (
            <button key={id} type="button" className={`quiz-option${state}`} onClick={() => choose(id)} disabled={!!picked}>
              {node.title}
            </button>
          );
        })}
      </div>
      {picked && (
        <div className="quiz-card__reveal">
          <p>{picked === item.correct ? "Right — " : "Not quite. "}{item.explain}</p>
          <a className="pill" href={hrefFor({ kind: "concept", id: item.correct })}>Read about {getNode(item.correct).title}</a>
        </div>
      )}
    </div>
  );
}

function FallacyQuiz() {
  const [seed] = useState(() => Math.floor(Math.random() * 1e9));
  const order = useMemo(() => shuffle(quiz, seed), [seed]);
  const [step, setStep] = useState(0);
  const [answeredStep, setAnsweredStep] = useState(false);
  const [score, setScore] = useState<{ right: number; answered: number }>({ right: 0, answered: 0 });
  const [restartKey, setRestartKey] = useState(0);

  const done = step >= order.length;

  const answer = (correct: boolean) => {
    setScore((s) => ({ right: s.right + (correct ? 1 : 0), answered: s.answered + 1 }));
    setAnsweredStep(true);
  };

  const next = () => {
    setStep((s) => s + 1);
    setAnsweredStep(false);
  };

  const restart = () => {
    setStep(0);
    setAnsweredStep(false);
    setScore({ right: 0, answered: 0 });
    setRestartKey((k) => k + 1);
  };

  if (done) {
    return (
      <div className="quiz-card quiz-card--done">
        <p className="quiz-card__prompt">You got {score.right} of {order.length} right.</p>
        <p>{score.right === order.length
          ? "Every one — you've clearly read the field guide above."
          : "Fallacies get easier to spot the more you practice noticing the shape of an argument, not just its conclusion."}</p>
        <button type="button" className="pill" onClick={restart}>Try again, shuffled</button>
      </div>
    );
  }

  return (
    <div key={restartKey}>
      <Question
        key={order[step].id}
        item={order[step]}
        index={step}
        total={order.length}
        onAnswered={answer}
      />
      <div className="quiz-card__nav">
        <p className="page__note">Score so far: {score.right} of {score.answered}</p>
        {answeredStep && (
          <button type="button" className="pill" onClick={next}>
            {step + 1 < order.length ? "Next question" : "See your score"}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * A dedicated page for arguing well: what makes a case sound, how to debate in good faith,
 * a field guide to the fallacies that break an argument, and a quiz for spotting them live.
 * Reuses the reasoning and fallacies concepts already written in the library rather than
 * duplicating their content — this page is a curated front door onto them.
 */
export function DebatePage() {
  return (
    <article className="page debate-page">
      <nav className="crumbs" aria-label="Where this lives">
        <a href={hrefFor({ kind: "library" })}>Library</a><span aria-hidden="true">›</span>
        <a href={hrefFor({ kind: "department", id: "reasoning" })}>Reasoning & Debate</a><span aria-hidden="true">›</span>
        <strong aria-current="page">How to Argue Well</strong>
      </nav>

      <header className="page__head">
        <OrbGlyph state="listening" voice="lucid" seed="debate-guide" size={72} />
        <div className="page__heading">
          <p className="eyebrow">Reasoning & Debate</p>
          <h1 className="page__title">How to Argue Well</h1>
        </div>
        <div className="page__actions">
          <a className="pill" href={hrefFor({ kind: "department", id: "reasoning" })}>Browse the deck</a>
        </div>
      </header>
      <p className="page__lede">A short guide to building a case that holds up, debating people in good faith, and catching the moves — your own included — that make an argument feel convincing without actually being right.</p>

      <section className="page__section" aria-labelledby="build">
        <h2 id="build">Build a case that holds up</h2>
        <p className="page__note">An argument is a conclusion plus the reasons offered for it, laid out so someone else can check each step. Three ways to get from evidence to a conclusion, and the standards a good one has to meet:</p>
        <TopicList ids={["argument", "deduction", "induction", "abduction", "validity", "soundness"]} />
        <p className="page__note" style={{ marginTop: 18 }}>How to treat evidence, and who has to bring it:</p>
        <TopicList ids={["evidence", "burden-of-proof", "occams-razor", "hanlons-razor", "sagan-standard", "hitchens-razor"]} />
      </section>

      <section className="page__section" aria-labelledby="fair">
        <h2 id="fair">Debate in good faith</h2>
        <p className="page__note">The point of a debate is to get closer to what's true, not to win a point. That means arguing against the strongest version of a claim, not the weakest, and being willing to state clearly what would change your mind.</p>
        <TopicList ids={["steelmanning", "principle-of-charity", "socratic-method", "dialectic", "devils-advocate", "modes-of-persuasion", "rhetoric", "debate"]} />
      </section>

      <section className="page__section" aria-labelledby="field-guide">
        <h2 id="field-guide">A field guide to fallacies</h2>
        <p className="page__note">A fallacy is an argument that feels persuasive without actually being valid — the reasoning fails even though the conclusion might, by luck, still be true. They cluster into a few recognizable families:</p>
        <div className="debate-families">
          {FAMILIES.map((f) => <FallacyFamily key={f.id} {...f} />)}
        </div>
      </section>

      <section className="page__section" aria-labelledby="biases">
        <h2 id="biases">Biases to watch for in yourself</h2>
        <p className="page__note">Fallacies are mistakes in an argument's structure. Cognitive biases are mistakes upstream of that — quirks in how minds judge and remember — and they are just as easy to fall for while feeling perfectly reasonable.</p>
        <TopicList ids={["confirmation-bias", "anchoring", "availability-heuristic", "sunk-cost", "hindsight-bias", "motivated-reasoning", "framing-effect", "dunning-kruger"]} />
      </section>

      <section className="page__section" aria-labelledby="quiz">
        <h2 id="quiz">Practice: spot the fallacy</h2>
        <p className="page__note">Thirty-one short scenarios, shuffled fresh each time. Pick the fallacy or bias at work in each one.</p>
        <FallacyQuiz />
      </section>
    </article>
  );
}
