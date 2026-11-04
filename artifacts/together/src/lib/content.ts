export const CONTENT_STATUS = "Sample content — not clinically reviewed";
export const PROTOTYPE_LOCALE = "Prototype locale: United Kingdom (sample, unverified)";

export type Stage = "preconception" | "pregnancy" | "postpartum" | "paused";

export type ContentItem = {
  id: string;
  title: string;
  topic: "sleep" | "feeding" | "recovery" | "movement" | "nutrition" | "care" | "development" | "concerns" | "preparation" | "solids" | "play";
  stages: Stage[];
  summary: string;
  body: string[];
  demo?: { steps: string[] };
  source: string;
};

const SRC = "Prototype writing team — placeholder pending qualified clinical review";

export const LIBRARY: ContentItem[] = [
  { id: "prep-basics", title: "Getting ready, without a deadline", topic: "preparation", stages: ["preconception"], summary: "A practical, unhurried list of things people often sort out before trying.", body: ["Many people book a check-in with a GP or midwife before trying. It's a good moment to ask about supplements, current medicines and vaccinations.", "Household preparation matters too: leave policies, budgets, and who might help later.", "There is no correct timeline. Use what is useful and ignore the rest."], source: SRC },
  { id: "cycle-estimates", title: "What a fertile-window estimate can and can't tell you", topic: "preparation", stages: ["preconception"], summary: "Calendar estimates are rough. Here's why the range is wide.", body: ["Estimates from past cycle dates assume cycles stay similar. Many don't.", "An estimate is not contraception and not a diagnosis.", "If cycles are very irregular, a clinician can talk through options."], source: SRC },
  { id: "preconception-food", title: "Eating well while preparing", topic: "nutrition", stages: ["preconception", "pregnancy"], summary: "Simple, ordinary meals. Ask your clinician about supplements.", body: ["Varied meals with vegetables, whole grains and protein are a sensible base.", "Supplement advice varies by person and country — this prototype does not recommend doses."], source: SRC },
  { id: "pregnancy-movement", title: "Gentle movement library", topic: "movement", stages: ["pregnancy"], summary: "Short captioned demonstrations. Check with your clinician about what suits you.", body: ["These are general demonstrations, not a prescription.", "Stop and seek advice if anything hurts or feels wrong."], demo: { steps: ["Sit tall on a steady chair, feet flat.", "Breathe in slowly through your nose for four counts.", "Breathe out through your mouth for six counts.", "Roll shoulders back gently five times.", "Rest. Repeat only if it feels comfortable."] }, source: SRC },
  { id: "birth-prep", title: "Thinking through birth preferences", topic: "preparation", stages: ["pregnancy"], summary: "A short guide to writing preferences you can discuss with your care team.", body: ["Preferences are a conversation starter, not a contract.", "Include who you'd like with you, comfort ideas and feeding plans.", "Leave room for things to change."], source: SRC },
  { id: "first-weeks", title: "The first weeks at home", topic: "preparation", stages: ["pregnancy", "postpartum"], summary: "Meals, rest, visitors and who does what.", body: ["Agree a simple visitor plan before birth.", "Freeze a few meals or line up a meal rota.", "Decide who handles night tasks that don't need the feeding parent."], source: SRC },
  { id: "recovery-basics", title: "Recovery after birth", topic: "recovery", stages: ["postpartum"], summary: "Healing takes time. Rest, eat, and keep your follow-up appointments.", body: ["Recovery looks different for everyone, including after a caesarean.", "Keep postnatal check appointments and mention anything that worries you.", "Feelings can move around a lot in the first weeks. If low mood or anxiety lasts or feels heavy, talk to a professional."], source: SRC },
  { id: "safe-sleep", title: "Safer sleep basics", topic: "sleep", stages: ["pregnancy", "postpartum"], summary: "General safer-sleep principles. Follow your local official guidance.", body: ["Official safer-sleep guidance in many countries recommends placing babies on their back on a firm, flat surface.", "Check the current guidance from your country's health service — this prototype has not verified local wording."], source: SRC },
  { id: "newborn-sleep", title: "Newborn sleep is all over the place", topic: "sleep", stages: ["postpartum"], summary: "Short sleeps and frequent waking are common early on.", body: ["Young babies wake often, including to feed.", "A simple wind-down routine can help everyone, without expecting a particular result."], source: SRC },
  { id: "feeding-any", title: "Feeding, whichever way works", topic: "feeding", stages: ["pregnancy", "postpartum"], summary: "Breast, bottle, pumping or a mix — support for each.", body: ["Every approach can be done well. You can change approach at any time.", "If feeding hurts, isn't working, or you're worried about weight, a midwife, health visitor or lactation professional can help."], source: SRC },
  { id: "bottle-care", title: "Cleaning bottles and pump parts", topic: "care", stages: ["postpartum"], summary: "Captioned demonstration.", body: ["Follow the manufacturer's instructions for your equipment."], demo: { steps: ["Rinse parts in cool water soon after use.", "Wash in hot soapy water with a dedicated brush.", "Rinse well.", "Sterilise as your equipment instructions describe.", "Air-dry on a clean rack."] }, source: SRC },
  { id: "bath", title: "A calm first bath", topic: "care", stages: ["postpartum"], summary: "Captioned demonstration.", body: ["Never leave a baby alone in or near water, even briefly."], demo: { steps: ["Gather towel, clean nappy and clothes before starting.", "Check water with your elbow — warm, not hot.", "Support head and shoulders with one arm.", "Wash gently from face downwards.", "Lift out onto the towel and wrap straight away."] }, source: SRC },
  { id: "nappy", title: "Changing a nappy", topic: "care", stages: ["postpartum"], summary: "Captioned demonstration.", body: ["Keep one hand on the baby on any raised surface."], demo: { steps: ["Lay baby on a safe flat surface.", "Open the nappy and wipe front to back.", "Slide a clean nappy underneath.", "Fasten snugly, not tightly.", "Wash your hands."] }, source: SRC },
  { id: "crying", title: "When crying goes on and on", topic: "concerns", stages: ["postpartum"], summary: "Crying is common. Here's when to call someone.", body: ["Feeding, winding, a change, holding and quiet can all be worth trying.", "If you feel overwhelmed, put the baby somewhere safe and step away for a few minutes.", "Contact a clinician if the cry sounds different, or the baby seems unwell, is feeding poorly, or has a fever."], source: SRC },
  { id: "solids-ready", title: "Starting solids: signs of readiness", topic: "solids", stages: ["postpartum"], summary: "Readiness is about development, not sleep.", body: ["Many official sources suggest starting around six months, when a baby can sit with support and bring food to their mouth.", "Changes in sleep aren't a sign to start solids.", "Ask your health visitor about allergens and local guidance."], source: SRC },
  { id: "play-basics", title: "Play with what you already have", topic: "play", stages: ["postpartum"], summary: "Five-minute ideas using household items.", body: ["Talk through what you're doing — narrating counts as play.", "Tummy time on your chest.", "A crinkly paper bag to hear and touch.", "A wooden spoon and a pan lid, supervised."], source: SRC },
  { id: "pro-support", title: "Talking to a professional", topic: "recovery", stages: ["preconception", "pregnancy", "postpartum"], summary: "Routes to support. Contacts must be verified for your area.", body: ["Your GP, midwife or health visitor is a good first contact for physical or emotional concerns.", "This prototype does not list local helplines because they have not been verified for your region."], source: SRC },
];

export const PLAY_IDEAS = [
  "Lie on your back and let your baby do tummy time on your chest. Talk them through your day.",
  "Hold a scarf above them and let it drift down slowly.",
  "Sing the same short song at each nappy change.",
  "Show them their reflection in a mirror and name what you see.",
  "Crinkle a clean paper bag near them and pause — let them react.",
];

export const WARNING_SIGNS = {
  parent: ["Heavy bleeding, or bleeding that suddenly increases", "Chest pain or difficulty breathing", "Severe headache, vision changes or swelling", "Thoughts of harming yourself or your baby", "Fever, or a wound that is hot, red or weeping"],
  baby: ["Difficulty breathing or blue/grey colour around the lips", "Floppy, very sleepy or hard to wake", "A fever in a young baby", "Not feeding, or far fewer wet nappies", "A seizure, or a rash that does not fade when pressed"],
};

export const PRIORITY_SUGGESTIONS: Record<Stage, { key: string; title: string; why: string }[]> = {
  preconception: [
    { key: "pc-gp", title: "Book a preconception check-in", why: "Because you're preparing" },
    { key: "pc-leave", title: "Look up your leave policy at work", why: "Useful to know early" },
    { key: "pc-supporter", title: "Ask one person to be part of your circle", why: "Sharing makes later easier" },
  ],
  pregnancy: [
    { key: "pg-questions", title: "Choose questions for your next appointment", why: "Because you have an appointment coming up" },
    { key: "pg-meals", title: "Set up a meal rota for the first weeks", why: "Because preparation lasts after birth" },
    { key: "pg-birthplan", title: "Write birth preferences", why: "Because you're in your second trimester" },
  ],
  postpartum: [
    { key: "pp-rest", title: "Protect one rest block this week", why: "Because recovery matters as much as baby care" },
    { key: "pp-check", title: "Book or confirm the postnatal check", why: "Because follow-up is usually around 6–8 weeks" },
    { key: "pp-handover", title: "Update 'What works for our baby'", why: "Because it powers handover for helpers" },
  ],
  paused: [
    { key: "ps-rest", title: "Take whatever time you need", why: "Nothing here needs doing" },
  ],
};

export const CHECKLISTS: Record<string, { title: string; items: string[]; jurisdiction?: string; reviewDate?: string }> = {
  preconception: { title: "Getting ready", items: ["Preconception check-in with GP or midwife", "Ask about supplements and current medicines", "Check vaccinations are up to date", "Read leave and pay policies", "Rough budget for the first year"] },
  agenda: { title: "Preconception appointment agenda", items: ["Current medicines and supplements", "Any long-term conditions", "Previous pregnancies or losses, if relevant", "What to do if it takes a while"] },
  birthplan: { title: "Birth preferences", items: ["Who I'd like with me", "Comfort and pain-relief preferences to discuss", "Feeding plan for the first hours", "What to do if plans change"] },
  firstweeks: { title: "First weeks at home", items: ["Meal rota arranged", "Visitor plan agreed", "Night tasks shared out", "Supplies: nappies, wipes, muslins", "Postnatal check booked"] },
  packing: { title: "Childcare packing list", items: ["Spare clothes x2", "Nappies and wipes", "Labelled bottles or milk", "Comfort item", "Sun hat / warm hat"] },
  returnwork: { title: "Return-to-work preparation", items: ["Childcare start date confirmed", "Settling-in sessions booked", "Feeding plan agreed with childcare", "Care time for drop-off and pick-up", "Calendar events added"] },
  admin: { title: "Local admin timeline", jurisdiction: "United Kingdom — sample", reviewDate: "Not reviewed", items: ["Register the birth (check the official deadline on gov.uk)", "Tell your employer and confirm leave dates", "Check which benefits you may be eligible for on the official site", "Register baby with a GP", "Look into childcare applications and waiting lists"] },
};

export const QUESTION_CHIPS = ["Is this symptom normal?", "What should we watch for?", "When is the next check?", "Can we talk about feeding?", "How is recovery going?", "What tests are coming up?", "Who do we call out of hours?"];

export const LOG_CATEGORIES = [
  { key: "feed", label: "Feeds" },
  { key: "sleep", label: "Sleep" },
  { key: "diaper", label: "Nappies" },
  { key: "pumping", label: "Pumping" },
  { key: "medication", label: "Medication" },
  { key: "checkin", label: "Check-in" },
  { key: "question", label: "Questions" },
  { key: "cycle", label: "Cycle" },
  { key: "symptom", label: "Symptoms" },
];

export const GRANTS = [
  { key: "baby-logs", label: "Baby care logs" },
  { key: "routines", label: "Routines and 'what works'" },
  { key: "tasks", label: "Tasks and help requests" },
  { key: "shifts", label: "Care time & rest" },
  { key: "appointments", label: "Shared appointments" },
  { key: "medication", label: "Baby medication" },
  { key: "documents", label: "Baby documents" },
  { key: "contacts", label: "Contacts" },
];

export const PRIORITIES = ["Sleep", "Preparation", "Feeding", "Recovery", "Shared care", "Appointments", "Going back to work"];
