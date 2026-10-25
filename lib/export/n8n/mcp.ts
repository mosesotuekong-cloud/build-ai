import { createHash } from "node:crypto";
import { TRIGGER_KINDS, type Plan } from "../plan";
import { compileN8n, type N8nNode, type N8nWorkflow } from "./compile";

// "Create MCP tool" for n8n: two files.
// 1. The workflow, with an extra "When called as a tool" trigger beside its
//    own trigger, so other workflows (and the MCP server) can run it.
// 2. An MCP server workflow whose one tool runs that workflow, so Claude,
//    ChatGPT, Copilot Studio or any MCP client can call it.
// Node shapes are the ones checked against a real n8n instance for Builda
// Learn lesson 12 (mcpTrigger 2.1, toolWorkflow 2.2, executeWorkflowTrigger
// 1.2). Never guess node parameters; credentials stay empty.

const TYPES = {
  mcpTrigger: { type: "@n8n/n8n-nodes-langchain.mcpTrigger", typeVersion: 2.1 },
  toolWorkflow: { type: "@n8n/n8n-nodes-langchain.toolWorkflow", typeVersion: 2.2 },
  calledAsTool: { type: "n8n-nodes-base.executeWorkflowTrigger", typeVersion: 1.2 },
  sticky: { type: "n8n-nodes-base.stickyNote", typeVersion: 1 },
} as const;

const uuid = (seed: string) => {
  const h = createHash("sha1").update(seed).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

const snake = (text: string, max = 40) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, max)
    .replace(/_+$/g, "") || "item";

// The tool's name as AI apps see it: short snake_case.
export const toolName = (plan: Plan) => snake(plan.name, 50) || "run_workflow";

// What the AI app fills in when it calls the tool: the trigger form's
// questions if there is a form, otherwise one free-text field.
export function toolInputs(plan: Plan): { name: string; description: string }[] {
  const trigger = plan.blocks.find((b) => TRIGGER_KINDS.includes(b.kind));
  const fields = trigger?.fields?.length ? trigger.fields : null;
  if (!fields) return [{ name: "request_details", description: "Everything the workflow needs to know about this request, in plain words." }];
  const seen = new Set<string>();
  return fields.slice(0, 8).flatMap((f) => {
    const name = snake(f, 40);
    if (seen.has(name)) return [];
    seen.add(name);
    return [{ name, description: f }];
  });
}

export const toolDescription = (plan: Plan) =>
  `${plan.summary || plan.name}`.slice(0, 480) + " Call it once per request, with the details filled in.";

// File 1: the workflow, callable as a tool.
export function workflowAsTool(plan: Plan): N8nWorkflow {
  const wf = compileN8n(plan);
  const triggerTypes = new Set(["n8n-nodes-base.formTrigger", "n8n-nodes-base.scheduleTrigger", "n8n-nodes-base.webhook"]);
  const trigger = wf.nodes.find((n) => triggerTypes.has(n.type));
  const inputs = toolInputs(plan);
  const node: N8nNode = {
    id: uuid(`${plan.name}:called-as-tool`),
    name: "When called as a tool",
    ...TYPES.calledAsTool,
    position: trigger ? [trigger.position[0], trigger.position[1] + 220] : [0, 220],
    parameters: { inputSource: "workflowInputs", workflowInputs: { values: inputs.map((i) => ({ name: i.name, type: "string" })) } },
    notes: "Lets the Builda MCP server (or any workflow) run this one. Its fields arrive at the top level of $json, so check the next node reads them.",
    notesInFlow: false,
  };
  wf.nodes.push(node);
  if (trigger && wf.connections[trigger.name]) wf.connections[node.name] = structuredClone(wf.connections[trigger.name]);
  wf.name = `${plan.name} (callable as a tool)`;
  return wf;
}

// File 2: the MCP server with one tool that runs file 1.
export function mcpServer(plan: Plan): N8nWorkflow {
  const name = toolName(plan);
  const inputs = toolInputs(plan);
  const tool: N8nNode = {
    id: uuid(`${plan.name}:tool`),
    name,
    ...TYPES.toolWorkflow,
    position: [200, 220],
    parameters: {
      description: toolDescription(plan),
      source: "database",
      workflowId: { __rl: true, mode: "list", value: "" },
      workflowInputs: {
        mappingMode: "defineBelow",
        value: Object.fromEntries(inputs.map((i) => [i.name, `={{ $fromAI('${i.name}', '${i.description.replace(/'/g, "’")}', 'string') }}`])),
        matchingColumns: [],
        schema: inputs.map((i) => ({ id: i.name, displayName: i.name, required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: "string" })),
        attemptToConvertTypes: false,
        convertFieldsToString: false,
      },
    },
  };
  const server: N8nNode = {
    id: uuid(`${plan.name}:mcp`),
    name: "MCP Server",
    ...TYPES.mcpTrigger,
    position: [0, 0],
    parameters: {
      authentication: "bearerAuth",
      path: `builda-${snake(plan.name, 30).replace(/_/g, "-")}`,
      instructions: `${name}: ${plan.summary || plan.name} Call it once per request, with the details filled in.`.slice(0, 500),
    },
    webhookId: uuid(`${plan.name}:mcp-webhook`),
  };
  const note: N8nNode = {
    id: uuid(`${plan.name}:mcp-note`),
    name: "Sticky Note",
    ...TYPES.sticky,
    position: [-620, -320],
    parameters: {
      content: [
        `## ${plan.name}: MCP server`,
        "Made with Builda. Lets AI apps (Claude, ChatGPT, Microsoft Copilot Studio, Cursor…) call your workflow as a tool.",
        "### Set it up",
        "1. Import **the workflow callable as a tool** first, and save it.",
        `2. Open **${name}** here and choose that workflow in *Workflow*.`,
        "3. Open **MCP Server**: create a **Bearer Auth** credential with a long random token. Never leave an MCP server open.",
        "4. Publish both workflows, then copy the MCP Server's **Production URL** into your AI app's MCP settings, with the token.",
        "### Keep it safe",
        "Start read-only where you can, and keep a person approving anything that changes records or reaches customers.",
      ].join("\n"),
      width: 520,
      height: 440,
      color: 4,
    },
  };
  return {
    name: `${plan.name} (MCP server)`,
    nodes: [server, tool, note],
    connections: { [name]: { ai_tool: [[{ node: "MCP Server", type: "ai_tool", index: 0 }]] } },
    pinData: {},
    settings: { executionOrder: "v1" },
  };
}

// For any stack: the MCP tool definition (the same shape every MCP client
// lists), plus how to host it.
export function mcpToolSpec(plan: Plan, platformNames: string[]) {
  const inputs = toolInputs(plan);
  return {
    name: toolName(plan),
    title: plan.name,
    description: toolDescription(plan),
    inputSchema: {
      type: "object",
      properties: Object.fromEntries(inputs.map((i) => [i.name, { type: "string", description: i.description }])),
      required: inputs.map((i) => i.name),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    _builda: {
      note: "An MCP tool definition made with Builda. Host it on an MCP server that runs your workflow, then add the server to your AI app.",
      your_stack: platformNames,
      how_to_host: [
        "n8n: use Builda's n8n MCP server download (MCP Server Trigger + Call n8n Workflow Tool).",
        "Microsoft Copilot Studio: add the workflow as a tool or connect an MCP server under Tools.",
        "Anything else: wrap the workflow in an HTTPS endpoint and expose it from a small MCP server (see modelcontextprotocol.io).",
        "Always add authentication, start read-only, and keep a person approving actions that change records.",
      ],
    },
  };
}
