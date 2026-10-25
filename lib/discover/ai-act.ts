import { z } from "zod";

// EU AI Act: a first check, not legal advice. The Act puts some uses of AI in
// the "high-risk" category (Annex III), such as recruitment, promotion,
// firing, allocating work and monitoring staff; credit and insurance
// decisions; education admissions and grading. A few uses are banned
// outright, such as reading emotions at work. Chatbots and AI-written content
// must say they are AI. A person in the loop does not on its own take a
// system out of the high-risk category.
//
// This file gives an instant first read from keywords. After "Make it
// stronger", the AI's own assessment replaces it.

export const AI_ACT_CATEGORIES = ["prohibited", "high_risk", "transparency", "minimal"] as const;
export const aiActSchema = z.object({
  category: z.enum(AI_ACT_CATEGORIES),
  // The Annex III area or practice it touches, in plain words, or null.
  area: z.string().trim().max(120).nullable(),
  reason: z.string().trim().min(5).max(400),
  actions: z.array(z.string().trim().min(5).max(240)).max(5),
});
export type AiActCheck = z.infer<typeof aiActSchema> & { source: "keywords" | "ai" };

export const AI_ACT_LABELS: Record<AiActCheck["category"], { title: string; tone: "red" | "amber" | "blue" | "green" }> = {
  prohibited: { title: "Likely banned in the EU", tone: "red" },
  high_risk: { title: "Likely high-risk under the EU AI Act", tone: "amber" },
  transparency: { title: "Must say it's AI", tone: "blue" },
  minimal: { title: "Minimal risk under the EU AI Act", tone: "green" },
};

export const AI_ACT_CHECKER_URL = "https://futurium.ec.europa.eu/en/node/14371";

type Rule = { category: AiActCheck["category"]; area: string; words: RegExp; actions: string[] };

const HIGH_RISK_ACTIONS = [
  "Get a legal or compliance review before building; high-risk systems need risk management, logging, human oversight and documentation.",
  "Tell the people affected that AI is involved, and how to challenge a decision.",
  "Check whether it only does a narrow, preparatory task (for example tidying data before a person decides); that can fall outside high-risk, but document why.",
];

const RULES: Rule[] = [
  {
    category: "prohibited",
    area: "Emotion recognition at work or social scoring",
    words: /\b(emotion(al)? (recognition|detection|analysis)|detect(s|ing)? (mood|emotion)|sentiment of (staff|employees)|social scor)/i,
    actions: ["Don't build this for use at work or in education in the EU; inferring emotions there is banned, with narrow medical and safety exceptions.", "Talk to legal before going further."],
  },
  {
    category: "high_risk",
    area: "Employment: recruitment and selection",
    words: /\b(recruit\w*|candidates?|applicants?|cvs?\b|résumés?|resumes?|shortlist\w*|screen(ing)? (cvs|applicants|candidates)|hiring|job (ads?|adverts?|applications?)|interview scor\w*)/i,
    actions: HIGH_RISK_ACTIONS,
  },
  {
    category: "high_risk",
    area: "Employment: promotion, dismissal, task allocation or monitoring staff",
    words: /\b(promotions?|dismiss\w*|terminat\w* (employ|staff|contract)|firing|redundanc\w*|disciplinar\w*|performance (review|rating|scor\w*|evaluation)|allocat\w* (tasks?|shifts?|work)|monitor\w* (staff|employees|workers|performance))/i,
    actions: HIGH_RISK_ACTIONS,
  },
  {
    category: "high_risk",
    area: "Access to essential services: credit or insurance",
    words: /\b(credit ?(score|scoring|worthiness|check)|creditworth\w*|loan (approv|decision|application)\w*|life insurance|health insurance (pric|premium)\w*|insurance pricing)/i,
    actions: HIGH_RISK_ACTIONS,
  },
  {
    category: "high_risk",
    area: "Education: admissions, grading or proctoring",
    words: /\b(admissions?|grad(e|ing) (students|exams|essays)|mark(ing)? (exams|assignments)|exam proctor\w*|student (assessment|evaluation))/i,
    actions: HIGH_RISK_ACTIONS,
  },
  {
    category: "transparency",
    area: "Chatbots and AI-generated content",
    words: /\b(chat ?bot|virtual assistant|whatsapp bot|voice (bot|assistant)|ai (replies|responds|answers) (to )?(customers|staff|people)|draft\w* (replies|emails|messages) (to|for) customers|generat\w* (images|videos|content))/i,
    actions: ["Tell people they're talking to AI, and label AI-generated content.", "Give an easy way to reach a person."],
  },
];

// The instant first read, from the challenge and the design.
export function keywordCheck(text: string): AiActCheck {
  for (const category of AI_ACT_CATEGORIES) {
    const hit = RULES.find((r) => r.category === category && r.words.test(text));
    if (hit) {
      const match = text.match(hit.words)?.[0] ?? "";
      return {
        category,
        area: hit.area,
        reason:
          category === "prohibited"
            ? `It mentions “${match}”. Using AI to infer emotions at work, or to score people socially, is banned in the EU.`
            : category === "high_risk"
              ? `It mentions “${match}”, which falls under ${hit.area.toLowerCase()} in Annex III of the Act. A person in the loop doesn't on its own change that.`
              : `It mentions “${match}”. People must be told when they deal with AI or see AI-made content.`,
        actions: hit.actions,
        source: "keywords",
      };
    }
  }
  return {
    category: "minimal",
    area: null,
    reason: "Nothing in the design points to a high-risk or banned use. Keep it that way if the scope grows.",
    actions: ["Keep a simple record of what the AI does and who checks it."],
    source: "keywords",
  };
}
