import type { Plan } from "./plan";

// Every platform compiler turns the neutral plan into a file the builder can
// import. n8n is the first; Power Automate and Copilot Studio come later and
// plug in here without touching the plan.
export interface WorkflowCompiler {
  platform: string;
  fileExtension: string;
  mimeType: string;
  compile(plan: Plan): string;
}
