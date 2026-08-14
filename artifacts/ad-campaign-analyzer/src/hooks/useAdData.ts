import { useState, useEffect, useMemo } from "react";
import { AdCampaignData, loadDefaultCsv, parseCsvFile } from "../lib/csvLoader";

export interface FilterState {
  dateRange: { from: Date | undefined; to: Date | undefined };
  channels: string[];
  goals: string[];
  segments: string[];
}

export function useAdData() {
  const [data, setData] = useState<AdCampaignData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Available filter options based on full dataset
  const [availableChannels, setAvailableChannels] = useState<string[]>([]);
  const [availableGoals, setAvailableGoals] = useState<string[]>([]);
  const [availableSegments, setAvailableSegments] = useState<string[]>([]);
  const [dateBounds, setDateBounds] = useState<{ min: Date; max: Date } | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    dateRange: { from: undefined, to: undefined },
    channels: [],
    goals: [],
    segments: [],
  });

  useEffect(() => {
    setIsLoading(true);
    loadDefaultCsv()
      .then((parsed) => {
        setData(parsed);
        extractOptions(parsed);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load default CSV");
        setIsLoading(false);
      });
  }, []);

  function extractOptions(dataset: AdCampaignData[]) {
    const ch = new Set<string>();
    const go = new Set<string>();
    const se = new Set<string>();
    let minT = Infinity;
    let maxT = -Infinity;

    dataset.forEach((row) => {
      if (row.Channel_Used) ch.add(row.Channel_Used);
      if (row.Campaign_Goal) go.add(row.Campaign_Goal);
      if (row.Customer_Segment) se.add(row.Customer_Segment);
      
      const t = row.Date.getTime();
      if (t < minT) minT = t;
      if (t > maxT) maxT = t;
    });

    setAvailableChannels(Array.from(ch).sort());
    setAvailableGoals(Array.from(go).sort());
    setAvailableSegments(Array.from(se).sort());
    if (minT !== Infinity && maxT !== -Infinity) {
      setDateBounds({ min: new Date(minT), max: new Date(maxT) });
      // Default to full range
      setFilters(prev => ({
        ...prev,
        dateRange: { from: new Date(minT), to: new Date(maxT) }
      }));
    }
  }

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    try {
      const parsed = await parseCsvFile(file);
      setData(parsed);
      extractOptions(parsed);
      // Reset filters when new file is uploaded
      setFilters({
        dateRange: { from: undefined, to: undefined },
        channels: [],
        goals: [],
        segments: [],
      });
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to parse CSV");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      // Date filter
      if (filters.dateRange.from && row.Date < filters.dateRange.from) return false;
      if (filters.dateRange.to && row.Date > filters.dateRange.to) return false;
      
      // Channels
      if (filters.channels.length > 0 && !filters.channels.includes(row.Channel_Used)) return false;
      // Goals
      if (filters.goals.length > 0 && !filters.goals.includes(row.Campaign_Goal)) return false;
      // Segments
      if (filters.segments.length > 0 && !filters.segments.includes(row.Customer_Segment)) return false;

      return true;
    });
  }, [data, filters]);

  const resetFilters = () => {
    setFilters({
      dateRange: dateBounds ? { from: dateBounds.min, to: dateBounds.max } : { from: undefined, to: undefined },
      channels: [],
      goals: [],
      segments: [],
    });
  };

  return {
    data,
    filteredData,
    isLoading,
    error,
    filters,
    setFilters,
    resetFilters,
    availableChannels,
    availableGoals,
    availableSegments,
    dateBounds,
    handleFileUpload,
  };
}
