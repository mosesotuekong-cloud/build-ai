import type { GeneratedCase } from "@/lib/ai/schemas/cases";

// The default HR deck: the six original cards from the HR & Automation
// breakout game (seed/hr-cards.md). The "cost" lines were written from each
// story and can be edited freely.
export const HR_DEFAULT_DECK_NAME = "HR essentials";

export const HR_DEFAULT_CASES: GeneratedCase[] = [
  {
    title: "The WhatsApp leave jungle",
    story:
      "Leave requests arrive by WhatsApp, phone calls and paper forms. Managers forget to approve them, HR updates a spreadsheet by hand, and nobody is sure of anyone's real leave balance. Last December, three people in one team were off at the same time and nobody noticed until it was too late.",
    cost: "Hours of spreadsheet updates every week, and a team left short-staffed in its busiest month.",
    who_feels_it: "HR officer, line managers, every employee.",
  },
  {
    title: "The onboarding document chase",
    story:
      "New hires must send ID, guarantor forms, bank details and certificates. HR spends the first two weeks chasing documents by email, and IT often sets up email and system access on day three. New staff sit around on day one with nothing to do and a bad first impression.",
    cost: "Two weeks of HR chasing per new hire, and new staff paid to sit idle on day one.",
    who_feels_it: "HR, IT, hiring managers, new hires.",
  },
  {
    title: "The month-end HR report scramble",
    story:
      "Every month HR pulls headcount, new hires, exits and absence from four different spreadsheets into a slide for management. It takes two days, the numbers rarely match, and by the time it is presented the data is already out of date.",
    cost: "Two days of analyst time every month, and leadership deciding on numbers that are already stale.",
    who_feels_it: "HR analyst, HR manager, leadership.",
  },
  {
    title: "The \"quick question\" inbox",
    story:
      "HR gets 30+ messages a week asking the same things: How many leave days do I have? Who is our HMO? When is payday? How do I change my pension provider? Each answer takes five minutes, and the real HR work waits.",
    cost: "About two and a half hours of HR time every week on repeat questions, with the real work pushed back.",
    who_feels_it: "HR generalists, every employee.",
  },
  {
    title: "Payroll inputs from five managers",
    story:
      "Overtime, deductions, new joiners and exits come in from line managers by email, each in a different format, and often after the cut-off date. Payroll is re-keyed by hand, and every month someone is underpaid or overpaid.",
    cost: "Payroll re-keyed by hand every month, and someone paid wrongly in every single run.",
    who_feels_it: "Payroll officer, finance, line managers, staff.",
  },
  {
    title: "Exit interviews nobody reads",
    story:
      "Leavers fill in an exit form and the responses pile up in a shared folder. Nobody reads them properly or looks for patterns. HR only finds out a manager is the problem after half of that team has resigned.",
    cost: "Warning signs missed until half a team has gone, and the cost of replacing every one of them.",
    who_feels_it: "HR business partner, leadership, remaining staff.",
  },
];
