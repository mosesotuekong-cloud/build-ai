// The starter packages a discovery can download beyond n8n, and which stack
// choices offer each one. Client-safe: the builders live in the download
// route, so this list can drive the results page too.

export type PackageKey = "power-automate" | "copilot-agent" | "databricks" | "fabric";

export type PackageInfo = {
  key: PackageKey;
  label: string;
  icon: string;
  // Stack choices (platform slugs) that offer this package.
  platforms: string[];
  // What it is and how to use it, one line each, for the results page.
  what: string;
  how: string;
  extension: "zip";
};

export const PACKAGES: PackageInfo[] = [
  {
    key: "power-automate",
    label: "Power Automate flow",
    icon: "🔁",
    platforms: ["power-automate"],
    what: "Your workflow as a cloud flow, with Outlook, Teams and Approvals steps.",
    how: "Power Automate → My flows → Import → Import Package (Legacy), then pick your own connection for each connector.",
    extension: "zip",
  },
  {
    key: "copilot-agent",
    label: "Copilot agent",
    icon: "🤖",
    platforms: ["copilot-studio", "m365-copilot"],
    what: "A Microsoft 365 Copilot agent that knows your rules, prepares cases and drafts messages, and leaves decisions to people.",
    how: "Upload it in Teams (Apps → Manage your apps → Upload an app) or ask your Microsoft 365 admin to add it.",
    extension: "zip",
  },
  {
    key: "databricks",
    label: "Databricks bundle",
    icon: "🧱",
    platforms: ["databricks-agents", "databricks-genie"],
    what: "Jobs and notebooks: prepare and decide each case, a review table for people, then apply their decisions.",
    how: "Run databricks bundle deploy from the unzipped folder. Schedules start paused.",
    extension: "zip",
  },
  {
    key: "fabric",
    label: "Fabric notebooks and pipelines",
    icon: "🧵",
    platforms: ["fabric"],
    what: "Notebooks and pipelines that prepare and decide each case, with a review table for people.",
    how: "Import the notebooks into your workspace and paste each pipeline into a new data pipeline's JSON view.",
    extension: "zip",
  },
];

export const packagesFor = (stack: string[]) => PACKAGES.filter((p) => p.platforms.some((s) => stack.includes(s)));
export const getPackage = (key: string) => PACKAGES.find((p) => p.key === key);
