import { idMaker } from "../ids";
import { recurrenceFrom } from "../schedule";
import { validatePlan, type Plan, type PlanBlock } from "../plan";
import { zip, type ZipFile } from "../zip";

// The Power Automate compiler: a validated plan becomes a cloud flow in the
// import package format (My flows → Import → Import Package (Legacy)). On
// import Power Automate asks the builder to pick their own connection for
// each connector, so no credentials travel in the file.
//
// Only actions whose shape is well known are used: Office 365 Outlook send
// email, Teams post message, Approvals, Condition, Switch, HTTP and Compose.
// Anything else (AI Builder prompts, Excel, SharePoint) becomes a Compose
// step that says exactly what to add, so the package always imports.
//
// Flow definitions can't express "two branches join again", so a block
// reached from two branches is copied into each, which keeps the meaning
// (each path does exactly what the plan says).

export const REPLACE = "REPLACE";

type Action = Record<string, unknown> & { runAfter: Record<string, string[]>; description?: string };
type Actions = Record<string, Action>;

type Connector = { name: string; displayName: string };
const CONNECTORS = {
  outlook: { name: "shared_office365", displayName: "Office 365 Outlook" },
  teams: { name: "shared_teams", displayName: "Microsoft Teams" },
  approvals: { name: "shared_approvals", displayName: "Approvals" },
} satisfies Record<string, Connector>;

// Steps that need a Power Automate Premium licence.
const PREMIUM_KINDS = new Set<PlanBlock["kind"]>(["webhook", "http_request"]);

const html = (text: string) => `<p>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n+/g, "</p><p>")}</p>`;
const replace = (what: string | null | undefined, fallback: string) => `${REPLACE}: ${what?.trim() || fallback}`;
export type PowerAutomateFlow = {
  displayName: string;
  definition: Record<string, unknown>;
  connectors: Connector[];
  premium: string[];
  placeholders: string[];
};

export function compilePowerAutomate(plan: Plan): PowerAutomateFlow {
  const problems = validatePlan(plan, { requireApproval: false });
  if (problems.length) throw new Error(`Cannot compile an invalid plan: ${problems.join(" ")}`);

  const byId = new Map(plan.blocks.map((b) => [b.id, b]));
  const linksFrom = (id: string) => plan.links.filter((l) => l.from === id);
  const used = new Map<string, Connector>();
  const premium = new Set<string>();
  const placeholders = new Set<string>();

  // Action names are unique keys across the whole flow.
  const usedKeys = new Set<string>();
  const keyFor = (label: string) => {
    const base = label.replace(/[^A-Za-z0-9 _-]/g, "").trim().replace(/\s+/g, "_").slice(0, 70) || "Step";
    let key = base;
    for (let i = 2; usedKeys.has(key); i++) key = `${base}_${i}`;
    usedKeys.add(key);
    return key;
  };

  const connection = (c: Connector, operationId: string, parameters: Record<string, unknown>) => {
    used.set(c.name, c);
    return {
      inputs: {
        host: { apiId: `/providers/Microsoft.PowerApps/apis/${c.name}`, connectionName: c.name, operationId },
        parameters,
        authentication: "@parameters('$authentication')",
      },
    };
  };

  // One block as an action (without its branches).
  const actionFor = (b: PlanBlock): Action => {
    const description = [b.note, b.condition && `Rule: ${b.condition}`].filter(Boolean).join(" ").slice(0, 990) || undefined;
    const base = { runAfter: {}, ...(description ? { description } : {}) };
    if (PREMIUM_KINDS.has(b.kind)) premium.add(b.label);
    switch (b.kind) {
      case "outlook_send":
      case "gmail_send":
        placeholders.add("recipient email addresses");
        return {
          ...base,
          type: "OpenApiConnection",
          ...connection(CONNECTORS.outlook, "SendEmailV2", {
            "emailMessage/To": replace(b.to, "recipient's email"),
            "emailMessage/Subject": b.subject || b.label,
            "emailMessage/Body": html(b.message || b.note || b.label),
            "emailMessage/Importance": "Normal",
          }),
          ...(b.kind === "gmail_send" ? { description: `${description ?? ""} Your design used Gmail; this sends from Outlook. Swap in the Gmail connector if you need to.`.trim() } : {}),
        };
      case "slack_send":
      case "whatsapp_send":
        placeholders.add("the Teams team and channel");
        return {
          ...base,
          type: "OpenApiConnection",
          ...connection(CONNECTORS.teams, "PostMessageToConversation", {
            poster: "Flow bot",
            location: "Channel",
            "body/recipient/groupId": replace(null, "pick the team"),
            "body/recipient/channelId": replace(null, "pick the channel"),
            "body/messageBody": html(b.message || b.note || b.label),
          }),
          description: `${description ?? ""} Your design used ${b.kind === "slack_send" ? "Slack" : "WhatsApp"}; this posts in Teams. Swap in that connector if you use it.`.trim(),
        };
      case "approval":
        placeholders.add("the approver's email");
        return {
          ...base,
          type: "OpenApiConnectionWebhook",
          ...connection(CONNECTORS.approvals, "StartAndWaitForAnApproval", {
            approvalType: "Basic",
            "WebhookApprovalCreationInput/title": `Please review: ${plan.name}`.slice(0, 200),
            "WebhookApprovalCreationInput/assignedTo": replace(b.to, "approver's email"),
            "WebhookApprovalCreationInput/details": b.message || b.note || b.label,
            "WebhookApprovalCreationInput/enableNotifications": true,
            "WebhookApprovalCreationInput/enableReassignment": true,
          }),
          description: `Human in control. ${b.note || b.message || "A person decides here."} The flow waits until they answer.`.slice(0, 990),
        };
      case "http_request":
        placeholders.add(`the ${b.system || "system"} API address and login`);
        return { ...base, type: "Http", inputs: { method: "GET", uri: `https://${REPLACE.toLowerCase()}-with-the-${(b.system || "system").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-api.example` } };
      case "if":
        placeholders.add("the Condition rules");
        return { ...base, type: "If", expression: { and: [{ equals: [replace(b.condition, "the value to check"), "yes"] }] }, actions: {}, else: { actions: {} } };
      case "switch":
        placeholders.add("the Switch value");
        return { ...base, type: "Switch", expression: replace(null, "the outcome to route on"), cases: {}, default: { actions: {} } };
      case "ai_agent":
        placeholders.add("the AI Builder prompt");
        return {
          ...base,
          type: "Compose",
          inputs: `${REPLACE}: add an AI Builder "Run a prompt" action here. Prompt: ${b.message || b.note || b.label} It should return: ${(b.outputs?.length ? b.outputs : ["outcome", "reason"]).join(", ")}. If unsure, it should say so and leave the decision to a person.`,
        };
      case "sheets_read":
        placeholders.add("the data source");
        return { ...base, type: "Compose", inputs: `${REPLACE}: add "List rows present in a table" (Excel Online) or "Get items" (SharePoint) here. Columns needed: ${(b.fields ?? []).join(", ") || "as in your design"}.` };
      case "sheets_append":
        placeholders.add("the data source");
        return { ...base, type: "Compose", inputs: `${REPLACE}: add "Add a row into a table" (Excel Online) or "Create item" (SharePoint) here. Columns: ${(b.fields ?? []).join(", ") || "as in your design"}.` };
      case "set_fields":
        return { ...base, type: "Compose", inputs: Object.fromEntries((b.fields?.length ? b.fields : ["summary"]).map((f) => [f, `${REPLACE}: value for ${f}`])) };
      default:
        return { ...base, type: "Compose", inputs: b.label };
    }
  };

  // Places a block (and everything after it) into a scope, after `after`.
  const emit = (id: string, scope: Actions, after: string | null, path: Set<string>) => {
    if (path.has(id)) return;
    const b = byId.get(id)!;
    const nextPath = new Set(path).add(id);
    const key = keyFor(b.label);
    const action = actionFor(b);
    if (after) action.runAfter = { [after]: ["Succeeded"] };
    scope[key] = action;
    const out = linksFrom(id);
    const plain = out.filter((l) => l.branch === null);

    if (b.kind === "if") {
      for (const l of out.filter((x) => x.branch === "true")) emit(l.to, action.actions as Actions, null, nextPath);
      for (const l of out.filter((x) => x.branch === "false")) emit(l.to, (action.else as { actions: Actions }).actions, null, nextPath);
    } else if (b.kind === "switch") {
      const cases = action.cases as Record<string, { case: string; actions: Actions }>;
      (b.cases ?? []).forEach((c, i) => {
        const targets = out.filter((l) => l.branch === c);
        if (!targets.length) return;
        const branch = { case: c, actions: {} as Actions };
        cases[`Case_${i + 1}`] = branch;
        for (const l of targets) emit(l.to, branch.actions, null, nextPath);
      });
      for (const l of out.filter((x) => x.branch === "otherwise")) emit(l.to, (action.default as { actions: Actions }).actions, null, nextPath);
    } else if (b.kind === "approval" && out.some((l) => l.branch)) {
      const checkKey = keyFor(`${b.label} approved`);
      const check: Action = {
        runAfter: { [key]: ["Succeeded"] },
        type: "If",
        expression: { and: [{ equals: [`@body('${key}')?['outcome']`, "Approve"] }] },
        actions: {},
        else: { actions: {} },
      };
      scope[checkKey] = check;
      for (const l of out.filter((x) => x.branch === "approved")) emit(l.to, check.actions as Actions, null, nextPath);
      for (const l of out.filter((x) => x.branch === "declined")) emit(l.to, (check.else as { actions: Actions }).actions, null, nextPath);
      for (const l of plain) emit(l.to, scope, checkKey, nextPath);
      return;
    }
    for (const l of plain) emit(l.to, scope, key, nextPath);
  };

  const trigger = plan.blocks.find((x) => ["form_trigger", "schedule_trigger", "webhook"].includes(x.kind))!;
  if (PREMIUM_KINDS.has(trigger.kind)) premium.add(trigger.label);
  const triggers: Record<string, unknown> = {};
  const triggerKey = keyFor(trigger.label);
  if (trigger.kind === "schedule_trigger") {
    triggers[triggerKey] = { type: "Recurrence", recurrence: recurrenceFrom(trigger.schedule || trigger.note) };
  } else if (trigger.kind === "webhook") {
    triggers[triggerKey] = { type: "Request", kind: "Http", inputs: { schema: { type: "object", properties: {} } } };
    placeholders.add(`${trigger.system || "the starting system"} calling the flow's HTTP address`);
  } else {
    const fields = trigger.fields?.length ? trigger.fields : ["Details"];
    const properties = Object.fromEntries(
      fields.map((f, i) => [i === 0 ? "text" : `text_${i}`, { title: f, type: "string", "x-ms-dynamically-added": true, description: `Enter ${f.toLowerCase()}`, "x-ms-content-hint": "TEXT" }]),
    );
    triggers[triggerKey] = { type: "Request", kind: "Button", inputs: { schema: { type: "object", properties, required: [] } } };
  }

  const actions: Actions = {};
  // Actions that start straight after the trigger run in parallel.
  for (const l of linksFrom(trigger.id)) emit(l.to, actions, null, new Set([trigger.id]));

  return {
    displayName: `${plan.name} (Builda starter)`.slice(0, 100),
    definition: {
      $schema: "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
      contentVersion: "1.0.0.0",
      parameters: { $connections: { defaultValue: {}, type: "Object" }, $authentication: { defaultValue: {}, type: "SecureObject" } },
      triggers,
      actions,
      description: `Made with Builda. ${plan.summary}`.slice(0, 1000),
    },
    connectors: [...used.values()],
    premium: [...premium],
    placeholders: [...placeholders],
  };
}

// The import package: a zip in the format Power Automate's "Import Package
// (Legacy)" reads. Each connector is a resource the builder maps to their own
// connection on import.
export function powerAutomatePackage(plan: Plan): Buffer {
  const flow = compilePowerAutomate(plan);
  const ids = idMaker(`pa:${plan.name}:${JSON.stringify(plan.blocks.map((b) => b.id))}`);
  const flowId = ids();
  const flowRes = ids().replace(/-/g, "").slice(0, 20);
  const resources: Record<string, unknown> = {};
  const apisMap: Record<string, string> = {};
  const connectionsMap: Record<string, string> = {};
  const connectionReferences: Record<string, unknown> = {};
  const deps: string[] = [];
  for (const c of flow.connectors) {
    const apiRes = ids().replace(/-/g, "").slice(0, 20);
    const connRes = ids().replace(/-/g, "").slice(0, 20);
    resources[apiRes] = {
      id: `/providers/Microsoft.PowerApps/apis/${c.name}`,
      name: c.name,
      type: "Microsoft.PowerApps/apis",
      suggestedCreationType: "Existing",
      details: { displayName: c.displayName },
      configurableBy: "System",
      hierarchy: "Child",
      dependsOn: [],
    };
    resources[connRes] = {
      type: "Microsoft.PowerApps/apis/connections",
      suggestedCreationType: "Existing",
      creationType: "Existing",
      details: { displayName: `Your ${c.displayName} connection` },
      configurableBy: "User",
      hierarchy: "Child",
      dependsOn: [apiRes],
    };
    apisMap[c.name] = apiRes;
    connectionsMap[c.name] = connRes;
    connectionReferences[c.name] = { connectionName: `${c.name.replace(/_/g, "-")}-builda`, source: "Embedded", id: `/providers/Microsoft.PowerApps/apis/${c.name}`, tier: "NotSpecified" };
    deps.push(apiRes, connRes);
  }
  resources[flowRes] = {
    type: "Microsoft.Flow/flows",
    suggestedCreationType: "New",
    creationType: "Existing, New, Update",
    details: { displayName: flow.displayName },
    configurableBy: "User",
    hierarchy: "Root",
    dependsOn: deps,
  };
  const manifest = {
    schema: "1.0",
    details: { displayName: flow.displayName, description: plan.summary.slice(0, 500), createdTime: "2026-01-01T00:00:00.0000000Z", packageTelemetryId: ids(), creator: "Builda", sourceEnvironment: "" },
    resources,
  };
  const definition = {
    name: flowId,
    id: `/providers/Microsoft.Flow/flows/${flowId}`,
    type: "Microsoft.Flow/flows",
    properties: {
      apiId: "/providers/Microsoft.PowerApps/apis/shared_logicflows",
      displayName: flow.displayName,
      definition: flow.definition,
      connectionReferences,
      flowFailureAlertSubscribed: false,
      isManaged: false,
    },
  };
  const files: ZipFile[] = [
    { path: "manifest.json", data: JSON.stringify(manifest, null, 2) },
    { path: "Microsoft.Flow/flows/manifest.json", data: JSON.stringify({ packageSchemaVersion: "1.0", flowAssets: { assetPaths: [flowRes] } }, null, 2) },
    { path: `Microsoft.Flow/flows/${flowRes}/definition.json`, data: JSON.stringify(definition, null, 2) },
    { path: `Microsoft.Flow/flows/${flowRes}/apisMap.json`, data: JSON.stringify(apisMap, null, 2) },
    { path: `Microsoft.Flow/flows/${flowRes}/connectionsMap.json`, data: JSON.stringify(connectionsMap, null, 2) },
  ];
  return zip(files);
}
