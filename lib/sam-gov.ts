/**
 * SAM.gov Opportunities API v2 client (proposal §5.2).
 * Docs: https://open.gsa.gov/api/get-opportunities-public-api/
 * Field names have shifted across SAM.gov API revisions before — verify
 * against current docs if responses stop matching this shape.
 */

const SAM_GOV_SEARCH_URL = "https://api.sam.gov/opportunities/v2/search";

export type SamGovOpportunity = {
  noticeId: string;
  title: string;
  fullParentPathName?: string;
  naicsCode?: string;
  typeOfSetAsideDescription?: string;
  type?: string;
  postedDate?: string;
  responseDeadLine?: string;
  placeOfPerformance?: {
    state?: { code?: string };
    zip?: string;
  };
  award?: { amount?: string };
  description?: string;
};

type SearchOpportunitiesParams = {
  naicsCode?: string;
  postedFrom: string; // MM/dd/yyyy
  postedTo: string; // MM/dd/yyyy
  limit?: number;
  offset?: number;
};

export async function searchOpportunities({
  naicsCode,
  postedFrom,
  postedTo,
  limit = 100,
  offset = 0,
}: SearchOpportunitiesParams): Promise<SamGovOpportunity[]> {
  const url = new URL(SAM_GOV_SEARCH_URL);
  url.searchParams.set("api_key", process.env.SAM_GOV_API_KEY ?? "");
  url.searchParams.set("postedFrom", postedFrom);
  url.searchParams.set("postedTo", postedTo);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  // The API's NAICS filter param is `ncode`, not `naicsCode` (the field
  // name in the *response* body) — confirmed empirically: `naicsCode` is
  // silently ignored and returns unfiltered results.
  if (naicsCode) url.searchParams.set("ncode", naicsCode);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`SAM.gov search failed (${response.status}): ${await response.text()}`);
  }

  const data = await response.json();
  return data.opportunitiesData ?? [];
}
