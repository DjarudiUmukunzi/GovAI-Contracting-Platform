/**
 * System prompt construction for the AI drafting workspace (proposal §5.3,
 * §6.3): company profile + solicitation text, so Claude writes as the
 * specific company rather than generically.
 */

type Organization = {
  legal_name: string;
  cage_code: string | null;
  uei: string | null;
  primary_naics_codes: string[];
  past_performance_summary: string | null;
};

type Opportunity = {
  title: string;
  agency: string | null;
  naics_code: string | null;
  set_aside_type: string | null;
  solicitation_text: string | null;
};

const SECTION_INSTRUCTIONS: Record<string, string> = {
  executive_summary: "Draft the executive summary section of the proposal.",
  technical_approach:
    "Draft the technical approach section, addressing the solicitation's stated requirements point by point.",
  management_approach:
    "Draft the management approach section: team structure, project management methodology, and risk mitigation.",
  past_performance:
    "Draft the past performance section, drawing on the company's past performance summary provided below.",
  key_personnel: "Draft key personnel bios relevant to this contract, based on the company profile.",
  price_narrative:
    "Draft the price narrative section, justifying the proposed approach's cost-effectiveness. Do not invent specific dollar figures that weren't provided.",
  certifications_checklist:
    "Draft a certifications and compliance checklist based on the solicitation's stated requirements.",
};

export const DRAFT_SECTIONS = Object.keys(SECTION_INSTRUCTIONS) as Array<keyof typeof SECTION_INSTRUCTIONS>;

export function isDraftSection(value: string): value is keyof typeof SECTION_INSTRUCTIONS {
  return value in SECTION_INSTRUCTIONS;
}

export function sectionInstruction(section: keyof typeof SECTION_INSTRUCTIONS) {
  return SECTION_INSTRUCTIONS[section];
}

export function buildDraftingSystemPrompt(organization: Organization, opportunity: Opportunity) {
  return `You are drafting a government contract proposal on behalf of ${organization.legal_name}.
Write as this specific company, not generically — use the company profile and past performance below wherever relevant.

Company profile:
- Legal name: ${organization.legal_name}
- CAGE code: ${organization.cage_code ?? "not provided"}
- UEI: ${organization.uei ?? "not provided"}
- Primary NAICS codes: ${organization.primary_naics_codes.join(", ") || "not provided"}
- Past performance summary: ${organization.past_performance_summary ?? "not provided"}

Solicitation:
- Title: ${opportunity.title}
- Agency: ${opportunity.agency ?? "unknown"}
- NAICS: ${opportunity.naics_code ?? "unknown"}
- Set-aside: ${opportunity.set_aside_type ?? "none"}

Full solicitation text:
${opportunity.solicitation_text ?? "Not available — draft from the summary information above only, and note where the full text would be needed."}

If Gmail, Calendar, or Drive MCP tools are available in this session, use Drive to retrieve the company's actual past performance documents, capability statement, and prior winning proposals before drafting — prefer real company material over generic boilerplate.`;
}
