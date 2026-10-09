// n8n node templates.
//
// Built from the node type definitions read (read-only) from Moses's n8n
// cloud instance on 2026-10-09, so node types, typeVersions and parameter
// shapes are exact. When n8n ships a new version of a node, re-read its
// definition and update the template here; tests/unit/n8n-compiler.test.ts
// pins every type and version.
//
// Credentials are never filled in. Values the builder must change start with
// "REPLACE".

export type NodeTemplate = {
  type: string;
  typeVersion: number;
  parameters: Record<string, unknown>;
  // Nodes that listen for HTTP calls (triggers, send-and-wait) need a webhookId.
  needsWebhookId?: boolean;
};

export const REPLACE = "REPLACE";
const expr = (body: string) => `={{ ${body} }}`;

type Ids = () => string;

export const N8N_TYPES = {
  formTrigger: { type: "n8n-nodes-base.formTrigger", typeVersion: 2.6 },
  scheduleTrigger: { type: "n8n-nodes-base.scheduleTrigger", typeVersion: 1.4 },
  webhook: { type: "n8n-nodes-base.webhook", typeVersion: 2.1 },
  gmail: { type: "n8n-nodes-base.gmail", typeVersion: 2.2 },
  outlook: { type: "n8n-nodes-base.microsoftOutlook", typeVersion: 2 },
  sheets: { type: "n8n-nodes-base.googleSheets", typeVersion: 4.7 },
  whatsApp: { type: "n8n-nodes-base.whatsApp", typeVersion: 1.1 },
  slack: { type: "n8n-nodes-base.slack", typeVersion: 2.7 },
  if: { type: "n8n-nodes-base.if", typeVersion: 2.3 },
  switch: { type: "n8n-nodes-base.switch", typeVersion: 3.4 },
  agent: { type: "@n8n/n8n-nodes-langchain.agent", typeVersion: 3.1 },
  chatModel: { type: "@n8n/n8n-nodes-langchain.lmChatOpenAi", typeVersion: 1.3 },
  outputParser: { type: "@n8n/n8n-nodes-langchain.outputParserStructured", typeVersion: 1.3 },
  httpRequest: { type: "n8n-nodes-base.httpRequest", typeVersion: 4.5 },
  set: { type: "n8n-nodes-base.set", typeVersion: 3.5 },
  stickyNote: { type: "n8n-nodes-base.stickyNote", typeVersion: 1 },
} as const;

const fieldName = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "") || "field";

const filterOptions = { caseSensitive: false, leftValue: "", typeValidation: "loose", version: 2 };

// --- Triggers ----------------------------------------------------------------

export function formTrigger(title: string, description: string, fields: string[]): NodeTemplate {
  return {
    ...N8N_TYPES.formTrigger,
    needsWebhookId: true,
    parameters: {
      formTitle: title,
      formDescription: description,
      formFields: { values: fields.map((f) => ({ fieldLabel: f, fieldType: /email/i.test(f) ? "email" : "text", requiredField: true })) },
      options: {},
    },
  };
}

// Plain-English schedules can't be compiled safely, so the starter runs every
// weekday morning and the sticky note says what the team asked for.
export function scheduleTrigger(): NodeTemplate {
  return {
    ...N8N_TYPES.scheduleTrigger,
    parameters: { rule: { interval: [{ field: "weeks", weeksInterval: 1, triggerAtDay: [1, 2, 3, 4, 5], triggerAtHour: 9, triggerAtMinute: 0 }] } },
  };
}

export function webhook(path: string): NodeTemplate {
  return { ...N8N_TYPES.webhook, needsWebhookId: true, parameters: { httpMethod: "POST", path, responseMode: "onReceived", options: {} } };
}

// --- Apps --------------------------------------------------------------------

export function gmailSend(to: string, subject: string, message: string): NodeTemplate {
  return {
    ...N8N_TYPES.gmail,
    parameters: { resource: "message", operation: "send", sendTo: to, subject, emailType: "text", message, options: { appendAttribution: false } },
  };
}

export function outlookSend(to: string, subject: string, message: string): NodeTemplate {
  return {
    ...N8N_TYPES.outlook,
    parameters: { resource: "message", operation: "send", toRecipients: to, subject, bodyContent: message, additionalFields: { bodyContentType: "Text" } },
  };
}

const sheetLocator = (name: string) => ({
  documentId: { __rl: true, mode: "list", value: "", cachedResultName: `${REPLACE}: pick the spreadsheet` },
  sheetName: { __rl: true, mode: "name", value: name },
});

export function sheetsRead(sheet: string): NodeTemplate {
  return { ...N8N_TYPES.sheets, parameters: { resource: "sheet", operation: "read", ...sheetLocator(sheet), options: {} } };
}

export function sheetsAppend(sheet: string, columns: string[]): NodeTemplate {
  return {
    ...N8N_TYPES.sheets,
    parameters: {
      resource: "sheet",
      operation: "append",
      ...sheetLocator(sheet),
      columns: {
        mappingMode: "defineBelow",
        value: Object.fromEntries(columns.map((c) => [c, expr(`$json.${fieldName(c)}`)])),
        schema: columns.map((c) => ({ id: c, displayName: c, required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true })),
      },
      options: {},
    },
  };
}

export function whatsAppSend(to: string, message: string): NodeTemplate {
  return {
    ...N8N_TYPES.whatsApp,
    parameters: { resource: "message", operation: "send", phoneNumberId: `${REPLACE}_PHONE_NUMBER_ID`, recipientPhoneNumber: to, messageType: "text", textBody: message },
  };
}

export function slackPost(message: string): NodeTemplate {
  return {
    ...N8N_TYPES.slack,
    parameters: { resource: "message", operation: "post", select: "channel", channelId: { __rl: true, mode: "list", value: "" }, messageType: "text", text: message, otherOptions: {} },
  };
}

// --- Logic -------------------------------------------------------------------

export function ifNode(ids: Ids, leftValue: string): NodeTemplate {
  return {
    ...N8N_TYPES.if,
    parameters: {
      conditions: {
        options: filterOptions,
        conditions: [{ id: ids(), leftValue, rightValue: "", operator: { type: "boolean", operation: "true", singleValue: true } }],
        combinator: "and",
      },
      looseTypeValidation: true,
      options: {},
    },
  };
}

export function switchNode(ids: Ids, leftValue: string, cases: string[], withFallback: boolean): NodeTemplate {
  return {
    ...N8N_TYPES.switch,
    parameters: {
      mode: "rules",
      rules: {
        values: cases.map((c) => ({
          conditions: {
            options: filterOptions,
            conditions: [{ id: ids(), leftValue, rightValue: c, operator: { type: "string", operation: "equals" } }],
            combinator: "and",
          },
          renameOutput: true,
          outputKey: c,
        })),
      },
      looseTypeValidation: true,
      options: withFallback ? { fallbackOutput: "extra", renameFallbackOutput: "Otherwise" } : {},
    },
  };
}

export function setFields(ids: Ids, fields: string[]): NodeTemplate {
  return {
    ...N8N_TYPES.set,
    parameters: {
      mode: "manual",
      assignments: { assignments: fields.map((f) => ({ id: ids(), name: fieldName(f), value: `${REPLACE}: ${f}`, type: "string" })) },
      includeOtherFields: true,
      include: "all",
      options: {},
    },
  };
}

export function httpRequest(system: string): NodeTemplate {
  return {
    ...N8N_TYPES.httpRequest,
    parameters: { method: "GET", url: `https://${REPLACE}.example/${fieldName(system)}/api`, authentication: "none", options: {} },
  };
}

// --- AI ----------------------------------------------------------------------

export function agent(instruction: string, systemMessage: string): NodeTemplate {
  return {
    ...N8N_TYPES.agent,
    parameters: { promptType: "define", text: instruction, hasOutputParser: true, options: { systemMessage } },
  };
}

export function chatModel(): NodeTemplate {
  return { ...N8N_TYPES.chatModel, parameters: { model: { __rl: true, mode: "list", value: "gpt-5-mini" }, options: {} } };
}

export function outputParser(outputs: string[]): NodeTemplate {
  const example = Object.fromEntries(outputs.map((o) => [fieldName(o), o.toLowerCase().startsWith("needs") || o.toLowerCase().startsWith("is_") ? true : "text"]));
  return { ...N8N_TYPES.outputParser, parameters: { schemaType: "fromJson", jsonSchemaExample: JSON.stringify(example, null, 2) } };
}

// --- Human in control: send-and-wait ------------------------------------------

const approvalOptions = (double: boolean) => ({
  responseType: "approval",
  approvalOptions: { values: double ? { approvalType: "double", approveLabel: "Approve", disapproveLabel: "Decline" } : { approvalType: "single", approveLabel: "Approve" } },
  options: { limitWaitTime: { values: { limitType: "afterTimeInterval", resumeAmount: 2, resumeUnit: "days" } } },
});

export function approval(channel: "email" | "slack" | "whatsapp", to: string, subject: string, message: string, double: boolean): NodeTemplate {
  if (channel === "slack") {
    return {
      ...N8N_TYPES.slack,
      needsWebhookId: true,
      parameters: { resource: "message", operation: "sendAndWait", select: "user", user: { __rl: true, mode: "list", value: "" }, message, ...approvalOptions(double) },
    };
  }
  if (channel === "whatsapp") {
    return {
      ...N8N_TYPES.whatsApp,
      needsWebhookId: true,
      parameters: { resource: "message", operation: "sendAndWait", phoneNumberId: `${REPLACE}_PHONE_NUMBER_ID`, recipientPhoneNumber: to, message, ...approvalOptions(double) },
    };
  }
  return {
    ...N8N_TYPES.gmail,
    needsWebhookId: true,
    parameters: { resource: "message", operation: "sendAndWait", sendTo: to, subject, message, ...approvalOptions(double) },
  };
}

export function stickyNote(content: string, width: number, height: number, color: number): NodeTemplate {
  return { ...N8N_TYPES.stickyNote, parameters: { content, width, height, color } };
}

export { expr, fieldName };
