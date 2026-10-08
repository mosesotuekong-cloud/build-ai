import type { CanvasSlot } from "@/lib/ai/schemas/canvas";

// The AI and automation platforms Builda knows about. Organisations pick
// their stack from this list; decks and sessions target some of them.
//
// Each platform says what it is good for (used to flavour case writing and
// coaching) and how each canvas slot is built on it (used for build guides).
// Product names and features change often. Keep this file up to date; it is
// the only place they live.

export type PlatformCategory = "automation" | "agents" | "data" | "rpa" | "suite";

export type Platform = {
  slug: string;
  name: string;
  vendor: string;
  category: PlatformCategory;
  // One line on the kind of problem this platform solves best.
  goodFor: string;
  // How each of the five slots is usually built on this platform.
  slots: Record<CanvasSlot, string>;
  // "compiler" means Builda can export a starter file; "guide" means a build guide.
  export: "compiler" | "guide";
};

export const PLATFORM_CATEGORIES: Record<PlatformCategory, string> = {
  automation: "Workflow automation",
  agents: "Agents and copilots",
  data: "Data and analytics AI",
  rpa: "Robotic process automation",
  suite: "Business suites",
};

export const PLATFORMS: Platform[] = [
  // --- Workflow automation ---------------------------------------------------
  {
    slug: "n8n",
    name: "n8n",
    vendor: "n8n",
    category: "automation",
    goodFor: "Multi-step workflows across many apps, with AI steps and human approvals.",
    export: "compiler",
    slots: {
      trigger: "A trigger node: form, webhook, schedule or an app event (new email, new row).",
      steps: "Nodes that fetch and tidy data: HTTP Request, Google Sheets, database nodes, Edit Fields.",
      decision: "IF or Switch nodes for rules; an AI Agent node with structured output for judgement.",
      action: "App nodes that do the work: Gmail, Outlook, Slack, WhatsApp Business, Sheets.",
      human: "A send-and-wait approval node, by email, Slack or chat.",
    },
  },
  {
    slug: "power-automate",
    name: "Power Automate",
    vendor: "Microsoft",
    category: "automation",
    goodFor: "Approvals and document flows across Outlook, Teams, SharePoint, Excel and Dataverse.",
    export: "guide",
    slots: {
      trigger: "An automated cloud flow trigger: when an email arrives, an item is created, a form is submitted, or a recurrence.",
      steps: "Actions such as Get items, List rows, Get file content and Compose to gather and shape data.",
      decision: "Condition or Switch for rules; an AI Builder prompt or model for judgement.",
      action: "Outlook, Teams, SharePoint, Excel and Dataverse actions.",
      human: "Start and wait for an approval, answered in Teams or Outlook.",
    },
  },
  {
    slug: "zapier",
    name: "Zapier",
    vendor: "Zapier",
    category: "automation",
    goodFor: "Quick app-to-app automations for small teams, with AI steps.",
    export: "guide",
    slots: {
      trigger: "A Zap trigger from one of thousands of apps, a form, a webhook or a schedule.",
      steps: "Lookup and Formatter steps, Tables and app search actions.",
      decision: "Paths and Filters for rules; an AI step for judgement.",
      action: "Actions in the target apps: send, create, update.",
      human: "Human in the loop: a request for approval or input before the Zap continues.",
    },
  },
  {
    slug: "make",
    name: "Make",
    vendor: "Make",
    category: "automation",
    goodFor: "Visual scenarios with branching and data mapping between many apps.",
    export: "guide",
    slots: {
      trigger: "A scenario trigger module: watch events, a webhook or a schedule.",
      steps: "Search and get modules, iterators and data stores to gather and shape data.",
      decision: "Routers with filters for rules; an AI module for judgement.",
      action: "App modules that create, update or send.",
      human: "An approval step, such as a message with approve and reject links that resumes the scenario.",
    },
  },
  {
    slug: "workato",
    name: "Workato",
    vendor: "Workato",
    category: "automation",
    goodFor: "Enterprise integrations and governed automations across ERP, HR and finance systems.",
    export: "guide",
    slots: {
      trigger: "A recipe trigger: a new or updated record, a webhook or a schedule.",
      steps: "Search and get actions across connected systems, with data pills mapping fields.",
      decision: "If conditions for rules; an AI action for judgement.",
      action: "Create and update actions in the business systems.",
      human: "A Workbot or approval workflow step that waits for a person.",
    },
  },

  // --- Agents and copilots ---------------------------------------------------
  {
    slug: "copilot-studio",
    name: "Copilot Studio",
    vendor: "Microsoft",
    category: "agents",
    goodFor: "Custom agents that answer questions from company knowledge and take actions through connectors.",
    export: "guide",
    slots: {
      trigger: "A topic triggered by what a person asks, or an event trigger for an autonomous agent.",
      steps: "Knowledge sources such as SharePoint, websites and Dataverse, plus connector actions to fetch records.",
      decision: "Generative orchestration and instructions for judgement; condition nodes for rules.",
      action: "Connector actions or Power Automate flows called as tools.",
      human: "An approval request or a handover to a person for anything risky.",
    },
  },
  {
    slug: "m365-copilot",
    name: "Microsoft 365 Copilot",
    vendor: "Microsoft",
    category: "agents",
    goodFor: "Helping people draft, summarise and find things across mail, files, Teams and meetings.",
    export: "guide",
    slots: {
      trigger: "A person asks in Copilot Chat, Teams, Outlook, Word or Excel, or uses a saved prompt or agent.",
      steps: "Grounding in the person's mail, files, chats and SharePoint through Microsoft Graph.",
      decision: "Copilot's reasoning, guided by agent instructions.",
      action: "Drafts, summaries, tables and replies for the person to use.",
      human: "The person reviews and edits before anything is sent or saved.",
    },
  },
  {
    slug: "agentforce",
    name: "Agentforce",
    vendor: "Salesforce",
    category: "agents",
    goodFor: "Agents working on customer and sales data inside Salesforce.",
    export: "guide",
    slots: {
      trigger: "A customer or employee message, or a record change in Salesforce.",
      steps: "Salesforce records and Data Cloud data used as grounding.",
      decision: "Agent topics and instructions for judgement; flow logic for rules.",
      action: "Agent actions: Flows, Apex or prompt templates that update records or reply.",
      human: "Escalation to a human agent or an approval process.",
    },
  },
  {
    slug: "gemini-enterprise",
    name: "Gemini Enterprise",
    vendor: "Google",
    category: "agents",
    goodFor: "Search and agents across company data, connected to Google Workspace and other apps.",
    export: "guide",
    slots: {
      trigger: "A person asks the assistant, or an agent runs on a schedule or event.",
      steps: "Connected data sources: Drive, Gmail, Calendar and third-party apps.",
      decision: "Agent instructions and Gemini reasoning.",
      action: "Agent actions in connected apps, or drafts for the person.",
      human: "The person confirms actions before they run.",
    },
  },
  {
    slug: "google-workspace-gemini",
    name: "Google Workspace with Gemini",
    vendor: "Google",
    category: "automation",
    goodFor: "Everyday automations in Gmail, Sheets, Drive and Chat, with Gemini steps.",
    export: "guide",
    slots: {
      trigger: "A Workspace event: a new email, a form response, a sheet change or a schedule.",
      steps: "Read from Sheets, Drive files and Gmail.",
      decision: "Simple conditions for rules; a Gemini step to summarise, classify or decide.",
      action: "Send emails or Chat messages, update Sheets, create Docs.",
      human: "A person approves through an email or Chat message before the next step.",
    },
  },
  {
    slug: "chatgpt-enterprise",
    name: "ChatGPT Enterprise",
    vendor: "OpenAI",
    category: "agents",
    goodFor: "Custom GPTs and agents that help staff with knowledge work, connected to company tools.",
    export: "guide",
    slots: {
      trigger: "A person starts a chat with a custom GPT or agent, or a scheduled task runs.",
      steps: "Uploaded knowledge files and connectors to company apps.",
      decision: "GPT instructions and model reasoning.",
      action: "Drafts, analyses and actions through connectors.",
      human: "The person reviews outputs and confirms actions.",
    },
  },
  {
    slug: "claude-enterprise",
    name: "Claude for Work",
    vendor: "Anthropic",
    category: "agents",
    goodFor: "Projects and agents that work with company documents and tools for analysis and drafting.",
    export: "guide",
    slots: {
      trigger: "A person asks in a Claude project, or an agent is started from another tool.",
      steps: "Project knowledge and connectors to company apps and files.",
      decision: "Project instructions and Claude's reasoning.",
      action: "Drafts, analyses and actions through connected tools.",
      human: "The person reviews and approves before anything leaves Claude.",
    },
  },
  {
    slug: "watsonx-orchestrate",
    name: "watsonx Orchestrate",
    vendor: "IBM",
    category: "agents",
    goodFor: "Agents that run HR, procurement and sales tasks across enterprise systems.",
    export: "guide",
    slots: {
      trigger: "A request in chat, or an event from a connected system.",
      steps: "Skills that read from HR, ERP and CRM systems.",
      decision: "Agent reasoning, or rules inside a workflow.",
      action: "Skills that update the business systems.",
      human: "An approval step in the workflow.",
    },
  },
  {
    slug: "amazon-q",
    name: "Amazon Q Business",
    vendor: "AWS",
    category: "agents",
    goodFor: "An assistant that answers from company data and runs simple actions through plugins.",
    export: "guide",
    slots: {
      trigger: "A person asks the assistant, or uses a Q App.",
      steps: "Indexed company data from connected sources.",
      decision: "The assistant's reasoning, limited by guardrails and access rules.",
      action: "Plugin actions in connected apps, or answers and drafts.",
      human: "The person confirms plugin actions.",
    },
  },

  // --- Data and analytics AI -------------------------------------------------
  {
    slug: "databricks-genie",
    name: "Databricks Genie",
    vendor: "Databricks",
    category: "data",
    goodFor: "Letting business people ask questions of governed data in plain language and get trusted answers.",
    export: "guide",
    slots: {
      trigger: "A business user asks a question in a Genie space.",
      steps: "Curated Unity Catalog tables, metric definitions, trusted queries and sample questions.",
      decision: "Genie turns the question into SQL; certified answers cover key metrics.",
      action: "An answer as a table or chart, shareable to dashboards.",
      human: "A data owner curates instructions and reviews answers that matter.",
    },
  },
  {
    slug: "databricks-agents",
    name: "Databricks agents and jobs",
    vendor: "Databricks",
    category: "data",
    goodFor: "AI agents and scheduled pipelines that work on data in the lakehouse.",
    export: "guide",
    slots: {
      trigger: "A scheduled job, a file arriving in storage, or a table update.",
      steps: "Pipelines that read and clean data from Unity Catalog tables.",
      decision: "SQL rules, or an AI function or agent for classification and extraction.",
      action: "Write results to tables, refresh dashboards or call an external system.",
      human: "Results flagged for review in a table or dashboard before they are used.",
    },
  },
  {
    slug: "snowflake-cortex",
    name: "Snowflake Cortex",
    vendor: "Snowflake",
    category: "data",
    goodFor: "Questions in plain language over Snowflake data, and AI functions inside SQL.",
    export: "guide",
    slots: {
      trigger: "A question from a business user, or a scheduled task.",
      steps: "Semantic models over governed Snowflake tables.",
      decision: "Cortex Analyst turns questions into SQL; AI functions classify or extract.",
      action: "Answers, tables and charts, or results written back to tables.",
      human: "A data owner maintains the semantic model and checks key answers.",
    },
  },
  {
    slug: "fabric",
    name: "Microsoft Fabric",
    vendor: "Microsoft",
    category: "data",
    goodFor: "Data agents and Copilot over OneLake data for analytics teams.",
    export: "guide",
    slots: {
      trigger: "A question to a Fabric data agent, a pipeline schedule, or an event.",
      steps: "Lakehouse, warehouse and semantic model data in OneLake.",
      decision: "The data agent writes the query; rules in pipelines.",
      action: "Answers, reports, or data written back for other tools.",
      human: "Data owners curate the agent and review important outputs.",
    },
  },
  {
    slug: "power-bi-copilot",
    name: "Power BI Copilot",
    vendor: "Microsoft",
    category: "data",
    goodFor: "Summaries and answers from existing Power BI reports and semantic models.",
    export: "guide",
    slots: {
      trigger: "A person asks Copilot inside a report, or a subscription runs.",
      steps: "The report's semantic model and measures.",
      decision: "Copilot interprets the question against the model.",
      action: "Narrative summaries, visuals or answers.",
      human: "The report owner checks the measures Copilot relies on.",
    },
  },
  {
    slug: "looker-gemini",
    name: "Looker with Gemini",
    vendor: "Google",
    category: "data",
    goodFor: "Conversational analytics over a governed Looker model.",
    export: "guide",
    slots: {
      trigger: "A person asks a question in conversational analytics.",
      steps: "The LookML semantic layer over BigQuery or other databases.",
      decision: "Gemini maps the question onto the model's fields and measures.",
      action: "Answers and charts, saved to dashboards.",
      human: "Model owners keep definitions accurate and review key answers.",
    },
  },

  // --- RPA -------------------------------------------------------------------
  {
    slug: "uipath",
    name: "UiPath",
    vendor: "UiPath",
    category: "rpa",
    goodFor: "Automating work in old desktop and web systems without APIs, plus agentic automation.",
    export: "guide",
    slots: {
      trigger: "An Orchestrator queue item, a schedule, an email or a trigger from an app.",
      steps: "Robots that read screens, documents and spreadsheets; Document Understanding for forms.",
      decision: "Rules in the workflow; AI models or agents for judgement.",
      action: "Robots that type into systems, send emails and update records.",
      human: "Action Center tasks where a person validates or approves.",
    },
  },
  {
    slug: "automation-anywhere",
    name: "Automation Anywhere",
    vendor: "Automation Anywhere",
    category: "rpa",
    goodFor: "Bots for repetitive work in desktop and web apps, with document processing.",
    export: "guide",
    slots: {
      trigger: "A schedule, a queue, an email or an API call.",
      steps: "Bots that read documents, screens and files.",
      decision: "Rules in the bot; AI for document understanding and judgement.",
      action: "Bots that enter data and send messages.",
      human: "A human-in-the-loop form where a person validates or approves.",
    },
  },

  // --- Business suites -------------------------------------------------------
  {
    slug: "servicenow",
    name: "ServiceNow",
    vendor: "ServiceNow",
    category: "suite",
    goodFor: "IT, HR and customer service requests with workflows, approvals and AI assistance.",
    export: "guide",
    slots: {
      trigger: "A catalogue request, an incident, a record change or a virtual agent chat.",
      steps: "Records in the platform, plus integration lookups.",
      decision: "Flow Designer conditions for rules; Now Assist for summaries and classification.",
      action: "Flow actions that assign, notify and update records.",
      human: "Approval steps and assignment to a person's queue.",
    },
  },
  {
    slug: "sap",
    name: "SAP Build and Joule",
    vendor: "SAP",
    category: "suite",
    goodFor: "Processes in SAP: purchasing, finance and HR, with approvals and Joule assistance.",
    export: "guide",
    slots: {
      trigger: "A form, an SAP business event or a schedule.",
      steps: "Lookups in SAP S/4HANA, SuccessFactors or other SAP data.",
      decision: "Decision tables for rules; Joule or AI services for judgement.",
      action: "Process steps that create or update SAP documents and notify people.",
      human: "Approval forms in the process inbox.",
    },
  },
  {
    slug: "zoho",
    name: "Zoho (Zia and Flow)",
    vendor: "Zoho",
    category: "suite",
    goodFor: "Automations and AI help inside Zoho CRM, People, Books and Desk for growing businesses.",
    export: "guide",
    slots: {
      trigger: "A record change in a Zoho app, a form, or a Zoho Flow trigger from another app.",
      steps: "Lookups across Zoho apps and connected services.",
      decision: "Workflow rules and Flow decisions; Zia for predictions and suggestions.",
      action: "Field updates, emails, tasks and messages.",
      human: "Approval processes in the Zoho app.",
    },
  },
];

export const PLATFORM_SLUGS = PLATFORMS.map((p) => p.slug);

export function getPlatform(slug: string): Platform | undefined {
  return PLATFORMS.find((p) => p.slug === slug);
}

export function platformNames(slugs: string[]): string[] {
  return slugs.map((s) => getPlatform(s)?.name ?? s);
}

// Only known slugs, de-duplicated, in catalog order.
export function cleanPlatformSlugs(slugs: string[]): string[] {
  const wanted = new Set(slugs);
  return PLATFORM_SLUGS.filter((s) => wanted.has(s));
}
