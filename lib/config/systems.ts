// Common places where work and data live today, offered as suggestions for a
// design's "Systems involved". Players can always type their own.
export const COMMON_SYSTEMS: string[] = [
  // Messaging and email
  "WhatsApp",
  "WhatsApp Business",
  "Slack",
  "Microsoft Teams",
  "Outlook",
  "Gmail",
  "SMS",
  "Phone calls",
  // Files and sheets
  "Excel",
  "Google Sheets",
  "SharePoint",
  "OneDrive",
  "Google Drive",
  "Shared folder",
  "Paper forms",
  "Microsoft Forms",
  "Google Forms",
  // HR and payroll
  "HRIS",
  "Payroll system",
  "SeamlessHR",
  "Workday",
  "SAP SuccessFactors",
  // Finance
  "Bank portal",
  "Sage",
  "QuickBooks",
  "Zoho Books",
  "Xero",
  "ERP",
  "SAP",
  "Oracle",
  "Remita",
  "POS terminal",
  // Sales and service
  "CRM",
  "Salesforce",
  "HubSpot",
  "Zoho CRM",
  "Freshdesk",
  "Zendesk",
  "Website forms",
  // Operations and IT
  "Jira",
  "ServiceNow",
  "Active Directory",
  "Inventory system",
  "GPS tracker portal",
  "Company website",
  "Data warehouse",
];

// Merges suggestion lists, keeping the first spelling of each and the order given.
export function mergeSuggestions(...lists: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const item of list) {
      const key = item.trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        out.push(item.trim());
      }
    }
  }
  return out;
}

// Suggestions for the tools a company's staff use day to day.
export const STAFF_TOOL_SUGGESTIONS: string[] = COMMON_SYSTEMS;
