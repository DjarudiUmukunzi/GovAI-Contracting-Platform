"use client";

import { useState } from "react";
import { saveOnboarding } from "@/app/onboarding/actions";

const CONTRACT_TYPES = ["RFP", "RFQ", "IFB", "SBIR"];
const SET_ASIDE_TYPES = ["8a", "SDVOSB", "HUBZone", "WOSB", "SBA"];

type Props = {
  initialProfile: {
    legal_name: string;
    cage_code: string | null;
    uei: string | null;
    sam_registration_status: string | null;
    primary_naics_codes: string[];
    past_performance_summary: string | null;
  };
  initialPreferences: {
    naics_codes: string[];
    psc_codes: string[];
    place_of_performance_state: string | null;
    place_of_performance_zip: string | null;
    place_of_performance_radius_miles: number | null;
    bid_value_min: number | null;
    bid_value_max: number | null;
    contract_types: string[];
    set_aside_types: string[];
    match_threshold: number;
    notification_frequency: string;
    notification_channel: string;
  };
};

function toCsv(values: string[]) {
  return values.join(", ");
}

function fromCsv(value: string) {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function OnboardingForm({ initialProfile, initialPreferences }: Props) {
  const [profile, setProfile] = useState(initialProfile);
  const [naicsCodesText, setNaicsCodesText] = useState(toCsv(initialProfile.primary_naics_codes));
  const [preferences, setPreferences] = useState(initialPreferences);
  const [prefNaicsText, setPrefNaicsText] = useState(toCsv(initialPreferences.naics_codes));
  const [prefPscText, setPrefPscText] = useState(toCsv(initialPreferences.psc_codes));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleListValue(list: string[], value: string) {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await saveOnboarding(
        { ...profile, primary_naics_codes: fromCsv(naicsCodesText) },
        { ...preferences, naics_codes: fromCsv(prefNaicsText), psc_codes: fromCsv(prefPscText) }
      );
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Company profile</h2>
        <label className="flex flex-col gap-1 text-sm">
          Legal name
          <input
            required
            value={profile.legal_name}
            onChange={(e) => setProfile({ ...profile, legal_name: e.target.value })}
            className="rounded border px-3 py-2"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            CAGE code
            <input
              value={profile.cage_code ?? ""}
              onChange={(e) => setProfile({ ...profile, cage_code: e.target.value || null })}
              className="rounded border px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            UEI
            <input
              value={profile.uei ?? ""}
              onChange={(e) => setProfile({ ...profile, uei: e.target.value || null })}
              className="rounded border px-3 py-2"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          SAM.gov registration status
          <select
            value={profile.sam_registration_status ?? ""}
            onChange={(e) => setProfile({ ...profile, sam_registration_status: e.target.value || null })}
            className="rounded border px-3 py-2"
          >
            <option value="">Not specified</option>
            <option value="registered">Registered</option>
            <option value="pending">Pending</option>
            <option value="expired">Expired</option>
            <option value="unregistered">Unregistered</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Primary NAICS codes (comma-separated)
          <input
            value={naicsCodesText}
            onChange={(e) => setNaicsCodesText(e.target.value)}
            placeholder="541511, 541512"
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Past performance summary
          <textarea
            value={profile.past_performance_summary ?? ""}
            onChange={(e) => setProfile({ ...profile, past_performance_summary: e.target.value || null })}
            rows={4}
            className="rounded border px-3 py-2"
          />
        </label>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Opportunity filters</h2>
        <label className="flex flex-col gap-1 text-sm">
          NAICS codes to match (comma-separated)
          <input
            value={prefNaicsText}
            onChange={(e) => setPrefNaicsText(e.target.value)}
            placeholder="541511, 541512"
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          PSC codes (comma-separated, optional)
          <input
            value={prefPscText}
            onChange={(e) => setPrefPscText(e.target.value)}
            className="rounded border px-3 py-2"
          />
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Place of performance state
            <input
              maxLength={2}
              value={preferences.place_of_performance_state ?? ""}
              onChange={(e) =>
                setPreferences({ ...preferences, place_of_performance_state: e.target.value.toUpperCase() || null })
              }
              placeholder="VA"
              className="rounded border px-3 py-2 uppercase"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            ZIP
            <input
              value={preferences.place_of_performance_zip ?? ""}
              onChange={(e) => setPreferences({ ...preferences, place_of_performance_zip: e.target.value || null })}
              className="rounded border px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Radius (miles)
            <input
              type="number"
              value={preferences.place_of_performance_radius_miles ?? ""}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  place_of_performance_radius_miles: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="rounded border px-3 py-2"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Bid value min ($)
            <input
              type="number"
              value={preferences.bid_value_min ?? ""}
              onChange={(e) =>
                setPreferences({ ...preferences, bid_value_min: e.target.value ? Number(e.target.value) : null })
              }
              className="rounded border px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Bid value max ($)
            <input
              type="number"
              value={preferences.bid_value_max ?? ""}
              onChange={(e) =>
                setPreferences({ ...preferences, bid_value_max: e.target.value ? Number(e.target.value) : null })
              }
              className="rounded border px-3 py-2"
            />
          </label>
        </div>
        <fieldset className="flex flex-col gap-1 text-sm">
          <legend className="mb-1">Contract types</legend>
          <div className="flex flex-wrap gap-3">
            {CONTRACT_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={preferences.contract_types.includes(type)}
                  onChange={() =>
                    setPreferences({ ...preferences, contract_types: toggleListValue(preferences.contract_types, type) })
                  }
                />
                {type}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-1 text-sm">
          <legend className="mb-1">Set-aside types</legend>
          <div className="flex flex-wrap gap-3">
            {SET_ASIDE_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={preferences.set_aside_types.includes(type)}
                  onChange={() =>
                    setPreferences({ ...preferences, set_aside_types: toggleListValue(preferences.set_aside_types, type) })
                  }
                />
                {type}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1 text-sm">
          Match threshold ({preferences.match_threshold}%)
          <input
            type="range"
            min={0}
            max={100}
            value={preferences.match_threshold}
            onChange={(e) => setPreferences({ ...preferences, match_threshold: Number(e.target.value) })}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Notification frequency
            <select
              value={preferences.notification_frequency}
              onChange={(e) => setPreferences({ ...preferences, notification_frequency: e.target.value })}
              className="rounded border px-3 py-2"
            >
              <option value="instant">Instant</option>
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly summary</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Notification channel
            <select
              value={preferences.notification_channel}
              onChange={(e) => setPreferences({ ...preferences, notification_channel: e.target.value })}
              className="rounded border px-3 py-2"
            >
              <option value="email">Email</option>
              <option value="in_app">In-app</option>
              <option value="both">Both</option>
            </select>
          </label>
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-600">Saved.</p>}
      <button
        type="submit"
        disabled={saving}
        className="w-fit rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
