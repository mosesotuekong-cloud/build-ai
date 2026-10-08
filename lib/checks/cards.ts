// The bank of short problem cards for the solo before-and-after checks.
// Cards come in matched pairs: each pair shares the same shape of problem
// (the same kind of trigger, decision and risk), so a player's warm-up and
// final round are equally hard and their scores can be compared fairly.
// Half the players get side A first and half get side B first.
//
// Cards avoid the recruitment worked example and the default HR deck, so
// they never give away an answer players meet elsewhere.

export type CheckCard = {
  id: string;
  pair: string;
  side: "a" | "b";
  area: string;
  title: string;
  story: string;
  // What a strong answer must get right, for reviewers (and the judge in milestone 7).
  focus: string;
};

export const CHECK_CARDS: CheckCard[] = [
  // Pair 1: a request that a simple rule can approve, with money involved.
  {
    id: "p1a",
    pair: "p1",
    side: "a",
    area: "Admin",
    title: "Petty cash on WhatsApp",
    story: "Staff ask the admin officer for petty cash by WhatsApp. She checks the amount against a limit in a notebook, asks a manager by phone if it's high, then pays from the cash box. Nobody can say what was spent last month.",
    focus: "A clear request trigger, a rule on the amount, and a person approving anything over the limit.",
  },
  {
    id: "p1b",
    pair: "p1",
    side: "b",
    area: "Operations",
    title: "Fuel advances by phone call",
    story: "Drivers call the transport desk for a fuel advance before long trips. The desk officer checks the route distance on a printed sheet, calls a supervisor for bigger amounts, then sends money by transfer. Advances are often paid twice.",
    focus: "A clear request trigger, a rule on the amount and route, and a person approving anything over the limit.",
  },
  // Pair 2: reading documents, with a human checking the doubtful ones.
  {
    id: "p2a",
    pair: "p2",
    side: "a",
    area: "Finance",
    title: "Supplier invoices in the inbox",
    story: "Suppliers email invoices as PDFs and photos. An accounts officer types each one into the accounting system, checking it against the purchase order. Typing errors mean some suppliers are paid the wrong amount.",
    focus: "Reading the invoice (extraction), matching it to the order, and a person checking any mismatch before payment.",
  },
  {
    id: "p2b",
    pair: "p2",
    side: "b",
    area: "Customer service",
    title: "Account opening forms on paper",
    story: "Branches scan paper account-opening forms and email them to head office. A team types the details into the core system and checks the ID. Mistyped names mean customers can't receive transfers.",
    focus: "Reading the form (extraction), checking it against the ID, and a person reviewing anything that doesn't match.",
  },
  // Pair 3: the same questions asked again and again.
  {
    id: "p3a",
    pair: "p3",
    side: "a",
    area: "IT",
    title: "Password reset requests",
    story: "Staff message the IT officer on WhatsApp whenever they're locked out. He verifies who they are by recognising their voice or number, resets the password and sends it back. He spends an hour a day on it.",
    focus: "A message trigger, checking identity properly, and a person handling anything unusual or suspicious.",
  },
  {
    id: "p3b",
    pair: "p3",
    side: "b",
    area: "Sales",
    title: "“Where is my order?” messages",
    story: "Customers send the sales line the same question every day: where is my order? A sales rep looks it up in the order sheet, calls the warehouse, and replies. Replies take hours and customers complain on social media.",
    focus: "A message trigger, looking up the order status, and a person handling complaints or delays.",
  },
  // Pair 4: a report that has to be built on a schedule.
  {
    id: "p4a",
    pair: "p4",
    side: "a",
    area: "Sales",
    title: "The Monday sales numbers",
    story: "Every Monday a sales analyst collects last week's figures from five regional spreadsheets, copies them into one file and emails a summary to the directors. If a region is late, the whole report is late.",
    focus: "A schedule trigger, gathering every source, and a person checking the numbers before they go out.",
  },
  {
    id: "p4b",
    pair: "p4",
    side: "b",
    area: "Operations",
    title: "The month-end stock count",
    story: "At month end each warehouse sends its stock count in a different spreadsheet. A planner merges them and emails a summary to management. Errors mean the company reorders things it already has.",
    focus: "A schedule trigger, gathering every source, and a person checking the numbers before they go out.",
  },
  // Pair 5: sorting incoming requests where judgement matters.
  {
    id: "p5a",
    pair: "p5",
    side: "a",
    area: "Customer service",
    title: "The shared complaints inbox",
    story: "All customer complaints land in one shared inbox. A supervisor reads each one and forwards it to billing, delivery or product teams. Urgent complaints sit unread for days behind simple ones.",
    focus: "An arriving message, judging the topic and urgency (AI where wording varies), and a person owning urgent or sensitive cases.",
  },
  {
    id: "p5b",
    pair: "p5",
    side: "b",
    area: "Facilities",
    title: "Maintenance requests from branches",
    story: "Branch managers email head office about broken generators, leaking roofs and faulty ACs. A facilities officer reads each one and decides who to send. Dangerous faults wait behind small ones.",
    focus: "An arriving message, judging the type and urgency (AI where wording varies), and a person owning anything dangerous.",
  },
  // Pair 6: dates that slip past.
  {
    id: "p6a",
    pair: "p6",
    side: "a",
    area: "Legal",
    title: "Contract renewals that slip",
    story: "Supplier contracts are kept in a shared folder. Nobody tracks when they end, so some renew automatically at higher prices and others lapse while the supplier is still delivering.",
    focus: "A date trigger well before the end date, the contract details gathered, and a person deciding to renew or not.",
  },
  {
    id: "p6b",
    pair: "p6",
    side: "b",
    area: "HR",
    title: "Expiring safety certificates",
    story: "Site staff need valid safety certificates. Expiry dates sit in a spreadsheet nobody checks, so people sometimes work with expired certificates and the company is fined after an inspection.",
    focus: "A date trigger well before expiry, the person's details gathered, and a manager confirming renewal or a change of duties.",
  },
];

export const CHECK_PAIRS = [...new Set(CHECK_CARDS.map((c) => c.pair))];

export function getCheckCard(id: string): CheckCard | undefined {
  return CHECK_CARDS.find((c) => c.id === id);
}

// A small stable hash, so a player always gets the same cards.
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Which card a player gets for each round. Both rounds use the same pair;
// the order of the two sides is balanced across players.
export function assignCheckCard(playerId: string, kind: "baseline" | "post"): CheckCard {
  const h = hash(playerId);
  const pair = CHECK_PAIRS[h % CHECK_PAIRS.length];
  const firstSide: "a" | "b" = (h >> 8) % 2 === 0 ? "a" : "b";
  const side = kind === "baseline" ? firstSide : firstSide === "a" ? "b" : "a";
  return CHECK_CARDS.find((c) => c.pair === pair && c.side === side)!;
}
