/**
 * Weighted match engine (proposal §5.2):
 * exact NAICS match (40%), location match (25%), bid range overlap (20%),
 * set-aside match (15%).
 */

type Opportunity = {
  naics_code: string | null;
  place_of_performance_state: string | null;
  estimated_value: number | null;
  set_aside_type: string | null;
};

type Preferences = {
  naics_codes: string[];
  place_of_performance_state: string | null;
  bid_value_min: number | null;
  bid_value_max: number | null;
  set_aside_types: string[];
};

export type MatchScores = {
  matchScore: number;
  naicsMatchScore: number;
  locationMatchScore: number;
  bidRangeMatchScore: number;
  setAsideMatchScore: number;
};

const WEIGHTS = { naics: 0.4, location: 0.25, bidRange: 0.2, setAside: 0.15 };

export function scoreOpportunity(opportunity: Opportunity, preferences: Preferences): MatchScores {
  const naicsMatchScore =
    opportunity.naics_code && preferences.naics_codes.includes(opportunity.naics_code) ? 100 : 0;

  const locationMatchScore =
    !preferences.place_of_performance_state ||
    opportunity.place_of_performance_state === preferences.place_of_performance_state
      ? 100
      : 0;

  const bidRangeMatchScore = (() => {
    if (opportunity.estimated_value == null) return 0;
    const min = preferences.bid_value_min ?? -Infinity;
    const max = preferences.bid_value_max ?? Infinity;
    return opportunity.estimated_value >= min && opportunity.estimated_value <= max ? 100 : 0;
  })();

  const setAsideMatchScore =
    preferences.set_aside_types.length === 0 ||
    (opportunity.set_aside_type != null && preferences.set_aside_types.includes(opportunity.set_aside_type))
      ? 100
      : 0;

  const matchScore = Math.round(
    naicsMatchScore * WEIGHTS.naics +
      locationMatchScore * WEIGHTS.location +
      bidRangeMatchScore * WEIGHTS.bidRange +
      setAsideMatchScore * WEIGHTS.setAside
  );

  return { matchScore, naicsMatchScore, locationMatchScore, bidRangeMatchScore, setAsideMatchScore };
}
