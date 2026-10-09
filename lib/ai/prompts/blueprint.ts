import { BLOCK_CATALOG, BLOCK_KINDS } from "@/lib/export/plan";

// System prompt for turning a team's final design into a tool-neutral plan.
// The plan is validated with zod and then checked again in code; if it fails,
// a rule-based plan is used instead.
export const BLUEPRINT_SYSTEM = `You turn a team's automation design from Builda (a workshop game with five slots: trigger, steps, decision, action, human in control) into a tool-neutral plan: a small graph of blocks.

Use ONLY these block kinds:
${BLOCK_KINDS.map((k) => `- ${k}: ${BLOCK_CATALOG[k]}`).join("\n")}

Rules:
- Exactly one trigger block (form_trigger, schedule_trigger or webhook), first, with no incoming links.
- At least one approval block. It is the team's "human in control" step: put it where the team said a person checks, approves or overrides.
- Follow the team's design. Do not add steps they did not describe, beyond what is needed to make it work.
- Use the app blocks only when the team named that app (or its maker) in their slots, tools or systems. For any other system, such as a local HRIS, payroll or ERP, use http_request with system set to its name.
- If the decision is AI judgement, use ai_agent and then an if or switch that reads its output. If it is a simple rule, use if or switch.
- Every block except the trigger must be reachable from the trigger. No loops.
- Links: branch is 'true' or 'false' after an if; one of the cases or 'otherwise' after a switch; null, 'approved' or 'declined' after an approval; null everywhere else.
- 3 to 12 blocks. ids are short snake_case words. labels are short (under 40 characters) and say what the block does.
- note says in one plain sentence what the block is for. Set every field that does not apply to null.
- Recipients ('to') are roles, never real names or addresses: "the line manager", "the customer", "#finance".
- name is the automation's name; summary is one or two plain sentences.

Plain British English.`;
