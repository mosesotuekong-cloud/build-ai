import type { GeneratedDeck } from "../schemas/cases";

// Mock case-generator output, keyed by function slug. Written in the voice of
// the seed HR cards. More functions are added in milestone 2.
export const caseFixtures: Record<string, GeneratedDeck> = {
  finance: {
    cases: [
      {
        title: "The receipt shoebox",
        story:
          "Staff pay for fuel, airtime and client lunches out of pocket, then send photos of receipts on WhatsApp or drop crumpled paper on the accountant's desk. Claims are checked by hand against a spreadsheet, half are missing a receipt, and refunds take six weeks. People have stopped claiming small amounts at all.",
        cost: "About 3 days of accountant time each month, and staff quietly absorbing ₦40,000+ each in unclaimed expenses.",
        who_feels_it: "Accountant, finance manager, every field staff member.",
      },
      {
        title: "Vendor invoices in five inboxes",
        story:
          "Suppliers email invoices to whoever they last spoke to: the MD, the admin officer, procurement, or the general info@ address. Some arrive as PDFs, some as photos, some on WhatsApp. Finance only finds out about an invoice when the supplier calls to complain it is 60 days overdue.",
        cost: "Late-payment penalties of around ₦600k a year and two suppliers who now demand payment upfront.",
        who_feels_it: "Accounts payable officer, procurement, suppliers, the MD.",
      },
      {
        title: "Bank reconciliation by highlighter",
        story:
          "Every month an accountant prints statements from three banks and ticks each line against the ledger with a highlighter. Transfers with vague narrations like 'TRF/FRM ADE' take hours to match to a customer. The books are never closed before the 15th of the next month.",
        cost: "Four working days a month, and management decisions made on figures that are two weeks stale.",
        who_feels_it: "Accountant, financial controller, leadership.",
      },
      {
        title: "Who has paid? Ask Chinedu",
        story:
          "Customers pay by transfer, POS and sometimes cash, and send proof of payment as a screenshot. Sales keeps chasing customers who have already paid, while some who haven't keep getting goods. Only Chinedu in credit control really knows who owes what, and he is going on leave.",
        cost: "Roughly ₦4m in debts more than 90 days old, and awkward calls to good customers who had already paid.",
        who_feels_it: "Credit control officer, sales team, customers.",
      },
      {
        title: "The budget request maze",
        story:
          "Any spend over ₦200,000 needs a paper memo signed by the line manager, head of department and finance. Memos sit on desks for days, get lost between floors, and nobody can see where a request is stuck. Urgent purchases get made anyway and the memo is signed after the fact.",
        cost: "An average of nine days to approve spend, and frequent off-budget purchases nobody can trace.",
        who_feels_it: "Department heads, finance, anyone who needs to buy something.",
      },
      {
        title: "Month-end tax schedules",
        story:
          "Each month finance pulls payroll and supplier payment data into a spreadsheet to work out PAYE, withholding tax and VAT. The schedules are rebuilt by hand, formulas break, and the figures for the tax portal are often ready on the last possible day.",
        cost: "Two days of senior accountant time monthly and a ₦250k late-filing penalty last year.",
        who_feels_it: "Tax accountant, financial controller, payroll officer.",
      },
    ],
  },
};
