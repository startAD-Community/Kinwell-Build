import type { Stage } from "@/lib/content";

export type InsightAction =
  | { kind: "topic"; label: string; href: string }
  | { kind: "read"; label: string; id: string; tab: "you" | "baby" }
  | { kind: "log"; label: string }
  | { kind: "question"; label: string; text: string }
  | { kind: "task"; label: string; text: string }
  | { kind: "help"; label: string; need: string };

export type Insight = {
  id: string;
  who: "baby" | "you";
  tone: "peach" | "sky" | "sage" | "sand";
  eyebrow: string;
  title: string;
  short: string;
  more: string[];
  actions: InsightAction[];
  source: string;
};

const SRC = "Sample summary based on NHS public guidance (nhs.uk teething & first solid foods) · not clinically reviewed";
const VARY = "Every baby and every parent is different. This describes what's common, not what will happen.";

function babyCards(m: number): Insight[] {
  if (m < 2) return [
    { id: "b-sleep-0", who: "baby", tone: "sky", eyebrow: "Sleep, often around now", title: "Short, scattered sleeps are expected", short: "Newborns often sleep in short stretches across day and night, waking to feed.", more: ["Day and night aren't sorted yet — that tends to develop over the first few months.", "Safer sleep basics: on their back, on a firm flat surface, in their own space.", VARY], actions: [{ kind: "topic", label: "Sleep & routines", href: "/care?tab=baby&topic=sleep" }, { kind: "read", label: "Safer sleep basics", id: "safe-sleep", tab: "baby" }, { kind: "log", label: "Log a sleep" }], source: SRC },
    { id: "b-feed-0", who: "baby", tone: "peach", eyebrow: "Feeding", title: "Frequent feeding is common, including at night", short: "Many young babies feed 8–12 times in 24 hours, sometimes in clusters in the evening.", more: ["Cluster feeding can feel relentless; it's usually a normal pattern, not a sign something's wrong.", "Wet and dirty nappies are one thing midwives and health visitors look at — they can talk it through with you.", VARY], actions: [{ kind: "topic", label: "Feeding & solids", href: "/care?tab=baby&topic=feeding" }, { kind: "question", label: "Ask at next check", text: "Is our feeding pattern okay?" }], source: SRC },
  ];
  if (m < 4) return [
    { id: "b-sleep-2", who: "baby", tone: "sky", eyebrow: "Sleep, often around now", title: "Some longer stretches may start to appear", short: "Around 2–4 months, some babies begin to sleep a little longer at night. Many don't yet.", more: ["A short, repeatable wind-down can help everyone — it's a routine, not training.", "Changes come and go; a few rough nights are not going backwards.", VARY], actions: [{ kind: "topic", label: "Sleep & routines", href: "/care?tab=baby&topic=sleep" }, { kind: "log", label: "Log a sleep" }], source: SRC },
    { id: "b-dev-2", who: "baby", tone: "sage", eyebrow: "Changing", title: "More smiles, sounds and drool", short: "Social smiles and cooing are common. Lots of drool and hand-chewing is too — it doesn't always mean teeth.", more: ["First teeth often arrive around 6 months, though some come earlier or much later.", VARY], actions: [{ kind: "topic", label: "Everyday care", href: "/care?tab=baby&topic=everyday" }], source: SRC },
  ];
  if (m < 6) return [
    { id: "b-sleep-4", who: "baby", tone: "sky", eyebrow: "Sleep, often around now", title: "Sleep can get unsettled for a while", short: "Around 4 months many families notice more night waking as sleep patterns mature. It's common and usually passes.", more: ["This isn't a sign to start solids, and it doesn't mean anything's been done wrong.", "Formal sleep training isn't offered under 6 months in Kinwell — routines and settling ideas are.", VARY], actions: [{ kind: "topic", label: "Sleep & routines", href: "/care?tab=baby&topic=sleep" }, { kind: "task", label: "Plan a rest swap", text: "Swap one night so each of us gets a longer sleep" }], source: SRC },
    { id: "b-solids-4", who: "baby", tone: "peach", eyebrow: "Coming up", title: "Solids: getting ready, not starting yet", short: "UK guidance suggests starting solids around 6 months. Now is a good time to read up and prepare.", more: ["Signs of readiness usually appear together: sitting steadily holding their head, coordinating eyes, hands and mouth, and swallowing food rather than pushing it out.", "Chewing fists or waking more are not signs of readiness.", VARY], actions: [{ kind: "topic", label: "Feeding & solids", href: "/care?tab=baby&topic=feeding" }, { kind: "read", label: "Signs of readiness", id: "solids-ready", tab: "baby" }], source: SRC },
    { id: "b-teeth-4", who: "baby", tone: "sage", eyebrow: "Maybe soon", title: "Teething can start anywhere from now", short: "Some babies show red cheeks, dribbling and chewing. Others breeze through.", more: ["A clean, cool teething ring can help. Ask a pharmacist before using any teething products.", "Fever or diarrhoea shouldn't be put down to teething — contact a clinician if your baby seems unwell.", VARY], actions: [{ kind: "question", label: "Ask about teething", text: "What helps with teething?" }], source: SRC },
  ];
  if (m < 9) return [
    { id: "b-solids-6", who: "baby", tone: "peach", eyebrow: "Around now", title: "First foods, at your baby's pace", short: "Around 6 months many babies are ready to start alongside milk. Early meals are about exploring, not amounts.", more: ["Milk is still their main food for now. Offer small tastes and let them lead.", "Note new foods and anything you observe; talk to a clinician about any reaction.", VARY], actions: [{ kind: "topic", label: "Feeding & solids", href: "/care?tab=baby&topic=feeding" }, { kind: "read", label: "Readiness guide", id: "solids-ready", tab: "baby" }], source: SRC },
    { id: "b-sleep-6", who: "baby", tone: "sky", eyebrow: "Sleep", title: "If you're thinking about sleep training", short: "From around 6 months some families try a gentle, gradual plan. Others don't — both are fine.", more: ["Plans in Kinwell never restrict feeds and never promise results.", "Pause any time for illness, travel, or because it doesn't feel right.", VARY], actions: [{ kind: "topic", label: "Sleep training & routines", href: "/care?tab=baby&topic=sleep" }], source: SRC },
    { id: "b-teeth-6", who: "baby", tone: "sage", eyebrow: "Common now", title: "Teeth, sitting and reaching", short: "First teeth often show up around now, and many babies are sitting with more control.", more: ["Start brushing with a smear of fluoride toothpaste once the first tooth appears.", VARY], actions: [{ kind: "task", label: "Add: buy a baby toothbrush", text: "Buy a baby toothbrush" }], source: SRC },
  ];
  return [
    { id: "b-move-9", who: "baby", tone: "sage", eyebrow: "Around now", title: "On the move, and more opinions", short: "Crawling, pulling up and separation feelings are all common around 9–12 months.", more: ["Waking at night can return during big developmental jumps. It's common and usually settles.", "A quick home safety check (stairs, cords, cupboards) is worth doing now.", VARY], actions: [{ kind: "task", label: "Add: baby-proof check", text: "Do a baby-proofing check together" }, { kind: "topic", label: "Everyday care", href: "/care?tab=baby&topic=everyday" }], source: SRC },
    { id: "b-food-9", who: "baby", tone: "peach", eyebrow: "Feeding", title: "More textures and finger foods", short: "Many babies move on to mashed, chopped and finger foods, eating with the family.", more: ["Keep offering variety; refusing a food once doesn't mean they'll never like it.", VARY], actions: [{ kind: "topic", label: "Feeding & solids", href: "/care?tab=baby&topic=feeding" }], source: SRC },
  ];
}

function parentCards(stage: Stage, m: number | null, week: number | null): Insight[] {
  if (stage === "paused") return [
    { id: "p-paused", who: "you", tone: "sand", eyebrow: "For you", title: "There's no right way to feel right now", short: "Pregnancy updates are paused. Your own care, contacts and periods are still here when you want them.", more: ["Your GP or midwife can talk things through, physically or emotionally.", "Nothing in Kinwell will celebrate or count down."], actions: [{ kind: "topic", label: "Your care", href: "/care?tab=you" }, { kind: "help", label: "Ask someone for company", need: "company" }], source: SRC },
  ];
  if (stage === "preconception") return [
    { id: "p-prep", who: "you", tone: "sage", eyebrow: "While you're preparing", title: "A few things are worth sorting early", short: "Many people book a pre-pregnancy chat with a GP and look at supplements and medicines.", more: ["Folic acid is commonly recommended before trying — ask what's right for you.", "Cycle dates can be useful to bring to appointments. They're a rough guide, not a fertility prediction."], actions: [{ kind: "topic", label: "Periods & cycle", href: "/care?tab=you&topic=periods" }, { kind: "question", label: "Add GP question", text: "What should I take or change before trying?" }], source: SRC },
    { id: "p-prep-baby", who: "baby", tone: "sky", eyebrow: "Getting a feel for it", title: "What the first months are actually like", short: "Short sleeps, frequent feeds and lots of learning. Knowing what's common makes it less alarming.", more: ["You don't need to plan it all now. A circle of people to share the load helps most."], actions: [{ kind: "topic", label: "Sleep & routines", href: "/care?tab=baby&topic=sleep" }], source: SRC },
  ];
  if (stage === "pregnancy") {
    const tri = !week ? null : week < 14 ? 1 : week < 28 ? 2 : 3;
    return [
      { id: `p-preg-${tri}`, who: "you", tone: "peach", eyebrow: week ? `Week ${week}` : "Pregnancy", title: tri === 1 ? "Tiredness and nausea are very common now" : tri === 2 ? "Many people feel more energy in these weeks" : tri === 3 ? "Sleep may be harder; heartburn and backache are common" : "Body changes vary week to week", short: tri === 3 ? "It's a good time to finish getting ready, at a gentle pace." : "Your body is doing a lot. Rest counts as preparation.", more: ["Tell your midwife about anything that worries you — no question is too small.", "Contact your maternity unit straight away about bleeding, reduced movements later in pregnancy, or severe pain."], actions: [{ kind: "question", label: "Add midwife question", text: "Is what I'm feeling normal at this stage?" }, { kind: "topic", label: "Your care", href: "/care?tab=you&topic=body" }], source: SRC },
      { id: "p-preg-sleep", who: "baby", tone: "sky", eyebrow: "After birth, briefly", title: "Newborn sleep is short and frequent", short: "Knowing this ahead helps you plan who covers what in the first weeks.", more: ["Safer sleep: a clear, flat, firm space on their back.", "No routine is expected in the early weeks."], actions: [{ kind: "read", label: "Safer sleep basics", id: "safe-sleep", tab: "baby" }, { kind: "task", label: "Agree night plan", text: "Agree who covers which nights in the first weeks" }], source: SRC },
    ];
  }
  // postpartum
  const mm = m ?? 0;
  return [
    mm < 3
      ? { id: "p-pp-0", who: "you", tone: "sage", eyebrow: "For you", title: "Recovery takes longer than most people expect", short: "Bleeding, soreness and big emotions are all common in the first weeks.", more: ["The 'baby blues' often pass within two weeks. If low mood or anxiety lasts or feels heavy, talk to your GP or health visitor.", "Your postnatal check is usually around 6–8 weeks."], actions: [{ kind: "help", label: "Ask for a meal", need: "meal" }, { kind: "topic", label: "Your recovery", href: "/care?tab=you&topic=body" }], source: SRC }
      : { id: "p-pp-3", who: "you", tone: "sage", eyebrow: "For you", title: "Tired in a different way now", short: "Many parents notice exhaustion catches up a few months in, alongside hair shedding and changing periods.", more: ["Periods can return any time, sooner if not breastfeeding. Logging dates can help at appointments.", "Struggling isn't failing. Your GP or health visitor can help."], actions: [{ kind: "topic", label: "Periods & cycle", href: "/care?tab=you&topic=periods" }, { kind: "help", label: "Ask for some rest", need: "rest" }], source: SRC },
  ];
}

export function insightsFor(stage: Stage, months: number | null, week: number | null): Insight[] {
  const parent = parentCards(stage, months, week);
  if (stage !== "postpartum") return parent;
  const baby = babyCards(months ?? 0);
  // interleave baby / parent, keep finite
  return [baby[0], parent[0], ...baby.slice(1)].filter(Boolean).slice(0, 4);
}
