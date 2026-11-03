import { db, households, profiles, memberships, familyRecords } from "@workspace/db";
import { id, hash, token } from "./together-context";

export async function createDemo(stage: string) {
  const householdId = id(), secret = token(), userId = `demo:${householdId}`;
  const alexUserId = `demo:${householdId}:alex`;
  const now = Date.now();
  const at = (hours: number) => new Date(now + hours * 3600000);
  const date = (days: number) => new Date(now + days * 86400000).toISOString().slice(0, 10);
  const childId = id();
  const profile = {
    name: "Maya", stage, country: "United Kingdom (prototype locale)", timezone: "Europe/London",
    childName: "Noah", birthDate: stage === "postpartum" ? date(-49) : "", dueDate: stage === "pregnancy" ? date(112) : "",
    priorities: ["Shared care", "Sleep", "Recovery"], lowEnergy: false, nightMode: false,
    feedingApproach: "combination", logCategories: ["feed", "sleep", "diaper", "pumping"], onboardingComplete: true,
  };
  const rows: any[] = [];
  const add = (kind: string, title: string, notes: string, data: Record<string, any> = {}, opts: Record<string, any> = {}) => {
    const recordId = id();
    rows.push({ id: recordId, householdId, authorId: userId, authorName: "Maya", kind, title, notes, status: "active", scope: "baby", childId, occurredAt: at(-1), data, ...opts });
    return recordId;
  };
  add("child", stage === "postpartum" ? "Noah" : "Our little one", "Family profile", { birthDate: profile.birthDate, dueDate: profile.dueDate });
  add("task", stage === "preconception" ? "Prepare questions for a preconception visit" : stage === "pregnancy" ? "Make a first-weeks-at-home plan" : "Make space for a little rest", "One small thing at a time.", { assignee: "Maya", dueDate: date(1), reason: "Because shared care makes room for you." }, { scope: "household", status: "open" });
  add("task", "Stock the freezer", "A few easy meals for the days you need them.", { assignee: "Alex", dueDate: date(2) }, { scope: "household", status: "accepted" });
  add("task", "Pick up a few groceries", "Oats, fruit, and something easy for dinner.", { assignee: "Alex", dueDate: date(0) }, { scope: "household", status: "completed", authorName: "Alex" });
  const appointmentId = add("appointment", stage === "preconception" ? "Preconception appointment" : stage === "pregnancy" ? "Your antenatal appointment" : "Your postnatal check-in", "A chance to ask about whatever is on your mind.", { timezone: "Europe/London", endAt: at(49.5).toISOString(), location: "Family health centre", clinician: "Dr. Taylor", participants: ["Maya"], calendarStatus: "disconnected" }, { occurredAt: at(49), scope: "private", status: "scheduled" });
  add("question", "What should I know before our next visit?", "Saved for your appointment.", { appointmentId, answered: false }, { scope: "private" });
  add("question", "Who can I contact between appointments?", "", { appointmentId, answered: false }, { scope: "private" });
  add("contact", "Family health centre", "Demo contact — replace with your verified care team.", { phone: "", email: "", type: "clinician" }, { scope: "household" });
  add("preference", "A little walk usually helps", "Noah often settles with gentle movement and a familiar voice. This is a family observation, not a medical instruction.", { category: "comfort", source: "Family preference" });
  add("preference", "Our feeding preferences", "Follow the current family feeding plan. Ask us if anything is unclear.", { category: "feeding", source: "Family preference" });
  add("checklist", "Getting ready for childcare", "Choose what fits your family; nothing here is mandatory.", { items: [{ text: "Choose your care arrangement", done: false }, { text: "Share feeding preferences", done: true }, { text: "Plan a settling-in visit", done: false }, { text: "Agree care shifts for returning to work", done: false }] }, { scope: "household" });
  add("checklist", "Your local paperwork", "Unverified sample checklist. Confirm requirements and eligibility with your local authority.", { jurisdiction: "United Kingdom — prototype", source: "https://www.gov.uk/register-birth", reviewDate: "", reviewStatus: "Unreviewed sample", items: [{ text: "Check local birth-registration requirements", done: false }, { text: "Discuss leave arrangements", done: false }, { text: "Look into childcare applications", done: false }] }, { scope: "household" });
  if (stage === "postpartum") {
    add("feed", "Bottle feed", "Last recorded feed, not a complete feeding history.", { method: "bottle", type: "expressed milk", amount: 90, unit: "ml" }, { occurredAt: at(-1.2), authorName: "Alex" });
    add("sleep", "A little afternoon nap", "", { startAt: at(-3).toISOString(), endAt: at(-2).toISOString(), duration: 60 }, { occurredAt: at(-3) });
    add("diaper", "Wet diaper", "", { type: "wet" }, { occurredAt: at(-2.5), authorName: "Alex" });
    add("shift", "Tonight, shared", "Offered care shift. Acceptance is not verification of physical supervision.", { assignee: "Alex", startAt: at(6).toISOString(), endAt: at(10).toISOString(), protectedRest: true }, { status: "accepted", scope: "household", occurredAt: at(6) });
    add("routine", "A gentle wind-down", "Sample family routine — not clinically reviewed. Follow your care team's guidance and current safe-sleep recommendations.", { steps: ["A quieter room", "A feed if needed", "A familiar goodnight", "Follow current safe-sleep guidance"], source: "https://www.nhs.uk/conditions/baby/caring-for-a-newborn/helping-your-baby-to-sleep/", reviewStatus: "Unreviewed sample" });
    add("help", "A home-cooked meal", "Something easy to reheat would be lovely.", { assignee: "Sam", recipients: ["Sam"], dueDate: date(1) }, { scope: "household", status: "open" });
  }
  if (stage === "preconception") {
    add("checklist", "Preparing, at your pace", "You don't need an exact timeline to start preparing.", { items: [{ text: "Book a preconception appointment", done: false }, { text: "Save questions for your care team", done: true }, { text: "Talk about practical support", done: false }] }, { scope: "private" });
    add("cycle", "Cycle started", "Manually recorded. Dates alone cannot establish ovulation.", { startDate: date(-16), endDate: date(-12) }, { scope: "private", occurredAt: at(-16 * 24) });
  }
  if (stage === "pregnancy") {
    add("checklist", "Our first weeks at home", "A practical plan that stays with you after birth.", { items: [{ text: "Arrange a few meals", done: true }, { text: "Choose a backup contact", done: false }, { text: "Agree protected rest periods", done: false }, { text: "Plan transport home", done: false }] }, { scope: "household" });
    add("shift", "An extra pair of hands", "A little practical help after baby arrives.", { assignee: "Alex", startAt: at(48).toISOString(), endAt: at(51).toISOString() }, { scope: "household", status: "offered" });
  }
  const content = [
    ["A little play idea for today", "Everyday care", "Follow your baby's cues. Pause whenever they need a break.", "https://www.nhs.uk/conditions/baby/babys-development/play-and-learning/", "postpartum"],
    ["Making room for your recovery", "Recovery", "Your wellbeing matters too. Keep your follow-up appointment and bring your questions.", "https://www.nhs.uk/conditions/baby/support-and-services/", "postpartum"],
    ["Sleep, one night at a time", "Sleep", "Explore gentle routines without pressure to start training. Sample material needs qualified review before public use.", "https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/getting-your-baby-to-sleep.aspx", "postpartum"],
    ["Starting solids: preparing together", "Feeding", "Read about readiness and discuss questions with your care team. This app does not assess readiness or diagnose reactions.", "https://www.nhs.uk/best-start-in-life/baby/weaning/how-to-start-weaning-your-baby/", "postpartum"],
    ["What's changing this week", "Development", "Learn about the changes that can come with pregnancy. Your care team can help with questions about your own pregnancy.", "https://www.nhs.uk/pregnancy/week-by-week/", "pregnancy"],
    ["Movement that fits your day", "Movement", "Ask your clinician about activities appropriate for you. No individual exercise prescription is provided here.", "https://www.nhs.uk/pregnancy/keeping-well/exercise/", "pregnancy"],
    ["Preparing for pregnancy", "Preparation", "Bring your medication, nutrition and health questions to a preconception appointment. No fertility guarantee or treatment advice.", "https://www.nhs.uk/pregnancy/trying-for-a-baby/planning-your-pregnancy/", "preconception"],
    ["Everyday care demonstrations", "Everyday care", "Sample demonstration transcript: gather your supplies, prepare your space, keep your baby safely supported, and ask your care team to demonstrate any steps you are unsure about. No reviewed video is available in this prototype.", "https://www.nhs.uk/conditions/baby/caring-for-a-newborn/", "postpartum"],
    ["Feeding, your way", "Feeding", "Breastfeeding, expressing, formula and combination feeding are supported. Keep questions for a qualified feeding professional.", "https://www.nhs.uk/conditions/baby/breastfeeding-and-bottle-feeding/", "postpartum"],
    ["Birth preparation, together", "Preparation", "Write down preferences and practical arrangements. Plans can change; your care team can guide clinical decisions.", "https://www.nhs.uk/pregnancy/labour-and-birth/", "pregnancy"],
    ["When you need more support", "Wellbeing", "Save verified local contacts and seek professional support if you are concerned. This app does not monitor you or dispatch help.", "https://www.nhs.uk/mental-health/", "all"],
  ];
  content.forEach(([title, topic, notes, source, contentStage]) => add("content", title!, notes!, { topic, stage: contentStage, source, locale: "UK prototype", reviewer: "Not yet reviewed", reviewStatus: "Unreviewed prototype content", reviewDate: "", version: "1", transcript: topic === "Everyday care" ? notes : undefined }, { scope: "household" }));
  await db.transaction(async tx => {
    await tx.insert(households).values({ id: householdId, name: "Maya & Alex's family", demoTokenHash: hash(secret), demoExpiresAt: new Date(now + 7 * 86400000) });
    await tx.insert(profiles).values([
      { id: userId, householdId, data: profile },
      { id: alexUserId, householdId, data: { name: "Alex", stage, country: profile.country, timezone: profile.timezone, childName: profile.childName, birthDate: profile.birthDate, onboardingComplete: true, priorities: ["Shared care"], logCategories: ["feed", "sleep", "diaper"] } },
    ]);
    await tx.insert(memberships).values([
      { id: id(), householdId, userId, name: "Maya", role: "administrator", status: "active", grants: ["care", "tasks", "documents", "medication", "appointments"] },
      { id: id(), householdId, userId: alexUserId, name: "Alex", role: "caregiver", status: "active", grants: ["care", "tasks", "shifts"] },
      { id: id(), householdId, name: "Sam", role: "helper", status: "invited", grants: ["tasks"] },
    ]);
    await tx.insert(familyRecords).values(rows);
  });
  return { secret, householdId };
}
