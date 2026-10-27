import type { Plan } from "./plan";

// Every platform compiler turns the neutral plan into a file the builder can
// import. n8n uses this interface; the zip packages (Power Automate, Copilot,
// Databricks, Fabric) are listed in ./packages.
export interface WorkflowCompiler {
  platform: string;
  fileExtension: string;
  mimeType: string;
  compile(plan: Plan): string;
}
