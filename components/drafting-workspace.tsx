"use client";

import { useState } from "react";
import { saveDraftSection } from "@/app/dashboard/drafts/actions";
import { DRAFT_SECTIONS } from "@/lib/drafting-prompt";

type Props = {
  opportunityId: string;
  solicitationText: string | null;
  initialSections: Record<string, string>;
};

const SECTION_LABELS: Record<string, string> = {
  executive_summary: "Executive summary",
  technical_approach: "Technical approach",
  management_approach: "Management approach",
  past_performance: "Past performance",
  key_personnel: "Key personnel",
  price_narrative: "Price narrative",
  certifications_checklist: "Certifications checklist",
};

export function DraftingWorkspace({ opportunityId, solicitationText, initialSections }: Props) {
  const [section, setSection] = useState<string>(DRAFT_SECTIONS[0]);
  const [sections, setSections] = useState<Record<string, string>>(initialSections);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const content = sections[section] ?? "";

  function setContent(value: string) {
    setSections((prev) => ({ ...prev, [section]: value }));
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setContent("");

    try {
      const response = await fetch("/api/drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId, section }),
      });

      if (!response.ok || !response.body) {
        throw new Error(await response.text());
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setContent(accumulated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await saveDraftSection(opportunityId, section, content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-gray-500">Solicitation</h2>
        <div className="h-[70vh] overflow-y-auto whitespace-pre-wrap rounded border p-3 text-sm">
          {solicitationText ?? "No solicitation text cached for this opportunity yet."}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="rounded border px-2 py-1 text-sm"
          >
            {DRAFT_SECTIONS.map((s) => (
              <option key={s} value={s}>
                {SECTION_LABELS[s] ?? s}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
            >
              {generating ? "Generating…" : "Generate with Claude"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || generating}
              className="rounded border px-3 py-1 text-sm disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="h-[70vh] resize-none rounded border p-3 text-sm"
          placeholder="Generate a draft, or write your own."
        />
      </div>
    </div>
  );
}
