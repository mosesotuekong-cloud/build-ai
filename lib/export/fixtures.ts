import { block, link, type Plan } from "./plan";

// Example plans covering every block kind and branch type. The compiler tests
// compile all of them; the mock AI returns the first one.

export const leaveRequestPlan: Plan = {
  name: "Leave request helper",
  summary: "An employee asks for leave on a form; a rule approves the easy ones, the line manager decides the rest, and the record and calendar are updated.",
  blocks: [
    block({ id: "request", kind: "form_trigger", slot: "trigger", label: "Leave request form", fields: ["Name", "Email", "First day", "Last day"], note: "The employee fills in the leave form." }),
    block({ id: "balance", kind: "sheets_read", slot: "steps", label: "Look up leave balance", fields: ["Email", "Days left"], note: "Find the employee's balance." }),
    block({ id: "hris", kind: "http_request", slot: "steps", label: "Check team leave in HRIS", system: "Local HRIS", message: "Fetch approved leave for the same team and dates.", note: "Who else is off?" }),
    block({ id: "rule", kind: "if", slot: "decision", label: "Enough days and no clash?", condition: "Balance covers the days and fewer than two teammates are off.", note: "" }),
    block({ id: "manager", kind: "approval", slot: "human", label: "Line manager decides", channel: "email", to: "the line manager", message: "A leave request needs your decision. The balance and clashes are shown below.", note: "The manager decides every request the rule can't settle." }),
    block({ id: "confirm", kind: "gmail_send", slot: "action", label: "Confirm to employee", to: "the employee", subject: "Your leave is approved", message: "Your leave is booked. Enjoy the break.", note: "" }),
    block({ id: "decline", kind: "gmail_send", slot: "action", label: "Explain the decline", to: "the employee", subject: "About your leave request", message: "Your manager couldn't approve these dates. They'll be in touch.", note: "" }),
    block({ id: "log", kind: "sheets_append", slot: "action", label: "Record the leave", fields: ["Email", "First day", "Last day", "Status"], note: "" }),
  ],
  links: [
    link("request", "balance"),
    link("balance", "hris"),
    link("hris", "rule"),
    link("rule", "confirm", "true"),
    link("rule", "manager", "false"),
    link("manager", "confirm", "approved"),
    link("manager", "decline", "declined"),
    link("confirm", "log"),
  ],
};

export const cvScreeningPlan: Plan = {
  name: "CV first look",
  summary: "AI scores each application against the job; strong ones get an invite, weak ones a polite decline, and a recruiter decides the middle band.",
  blocks: [
    block({ id: "apply", kind: "webhook", slot: "trigger", label: "New application", system: "Careers site", note: "The careers site sends each application." }),
    block({ id: "tidy", kind: "set_fields", slot: "steps", label: "Tidy the application", fields: ["Name", "Role", "CV text"], note: "" }),
    block({ id: "score", kind: "ai_agent", slot: "decision", label: "Score against the job", message: "Score this CV from 0 to 100 against the job and sort it into strong, middle or weak.", outputs: ["band", "score", "reason"], note: "" }),
    block({ id: "route", kind: "switch", slot: "decision", label: "Which band?", cases: ["strong", "middle", "weak"], note: "" }),
    block({ id: "invite", kind: "outlook_send", slot: "action", label: "Invite to interview", to: "the candidate", subject: "Next steps", message: "We'd like to meet you.", note: "" }),
    block({ id: "recruiter", kind: "approval", slot: "human", label: "Recruiter decides", channel: "slack", to: "the recruiter", message: "A middle-band CV needs your call.", note: "A recruiter decides every middle-band CV." }),
    block({ id: "decline", kind: "outlook_send", slot: "action", label: "Polite decline", to: "the candidate", subject: "Your application", message: "Thank you for applying.", note: "" }),
    block({ id: "team", kind: "slack_send", slot: "action", label: "Tell the hiring team", to: "#hiring", message: "A new candidate is moving forward.", note: "" }),
  ],
  links: [
    link("apply", "tidy"),
    link("tidy", "score"),
    link("score", "route"),
    link("route", "invite", "strong"),
    link("route", "recruiter", "middle"),
    link("route", "decline", "weak"),
    link("route", "recruiter", "otherwise"),
    link("recruiter", "invite"),
    link("invite", "team"),
  ],
};

export const paymentReminderPlan: Plan = {
  name: "Overdue invoice nudges",
  summary: "Every weekday, overdue invoices are found; a WhatsApp reminder goes out once finance approves the list.",
  blocks: [
    block({ id: "daily", kind: "schedule_trigger", slot: "trigger", label: "Every weekday morning", schedule: "every weekday at 8am", note: "" }),
    block({ id: "overdue", kind: "sheets_read", slot: "steps", label: "Find overdue invoices", fields: ["Customer", "Phone", "Amount", "Due date"], note: "" }),
    block({ id: "any", kind: "if", slot: "decision", label: "Anything overdue?", condition: "At least one invoice is past its due date.", note: "" }),
    block({ id: "finance", kind: "approval", slot: "human", label: "Finance approves reminders", channel: "whatsapp", to: "the finance lead", message: "Today's reminder list is ready. Approve to send.", note: "" }),
    block({ id: "remind", kind: "whatsapp_send", slot: "action", label: "Send the reminder", to: "the customer", message: "A friendly reminder that your invoice is overdue.", note: "" }),
  ],
  links: [link("daily", "overdue"), link("overdue", "any"), link("any", "finance", "true"), link("finance", "remind")],
};

export const FIXTURE_PLANS: Plan[] = [leaveRequestPlan, cvScreeningPlan, paymentReminderPlan];
