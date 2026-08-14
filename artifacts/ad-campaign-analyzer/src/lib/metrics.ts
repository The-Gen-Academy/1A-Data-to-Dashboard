import { AdCampaignData } from "./csvLoader";

export interface AggregateMetrics {
  totalSpend: number;
  totalConversions: number;
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgCpc: number;
  avgRoi: number;
  cpa: number;
  avgCvr: number;
}

export function computeMetrics(data: AdCampaignData[]): AggregateMetrics {
  if (data.length === 0) {
    return {
      totalSpend: 0,
      totalConversions: 0,
      totalClicks: 0,
      totalImpressions: 0,
      avgCtr: 0,
      avgCpc: 0,
      avgRoi: 0,
      cpa: 0,
      avgCvr: 0,
    };
  }

  let totalSpend = 0;
  let totalConversions = 0;
  let totalClicks = 0;
  let totalImpressions = 0;
  let sumRoi = 0;
  let sumCvr = 0;

  for (const row of data) {
    totalSpend += row.Spend;
    totalConversions += row.Conversions;
    totalClicks += row.Clicks;
    totalImpressions += row.Impressions;
    sumRoi += row.ROI;
    sumCvr += row.Conversion_Rate;
  }

  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const avgRoi = sumRoi / data.length;
  const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
  const avgCvr = (sumCvr / data.length) * 100;

  return {
    totalSpend,
    totalConversions,
    totalClicks,
    totalImpressions,
    avgCtr,
    avgCpc,
    avgRoi,
    cpa,
    avgCvr,
  };
}

export interface DailyMetric {
  dateStr: string;
  date: Date;
  spend: number;
  conversions: number;
  clicks: number;
  roi: number;
}

export function computeDailyMetrics(data: AdCampaignData[]): DailyMetric[] {
  const map = new Map<string, DailyMetric>();
  
  for (const row of data) {
    const dStr = row.DateStr;
    if (!map.has(dStr)) {
      map.set(dStr, { dateStr: dStr, date: row.Date, spend: 0, conversions: 0, clicks: 0, roi: 0 });
    }
    const cur = map.get(dStr)!;
    cur.spend += row.Spend;
    cur.conversions += row.Conversions;
    cur.clicks += row.Clicks;
    cur.roi += row.ROI; // Note: sum ROI, might need to average per day if we want true ROI line
  }

  // To get daily avg ROI, we need counts
  const countMap = new Map<string, number>();
  for (const row of data) {
    countMap.set(row.DateStr, (countMap.get(row.DateStr) || 0) + 1);
  }

  const result = Array.from(map.values()).map(d => ({
    ...d,
    roi: d.roi / (countMap.get(d.dateStr) || 1)
  }));

  result.sort((a, b) => a.date.getTime() - b.date.getTime());
  return result;
}

export interface PlatformMetric {
  platform: string;
  totalSpend: number;
  totalClicks: number;
  totalConversions: number;
  avgCtr: number;
  avgCpc: number;
  avgRoi: number;
}

export function computePlatformMetrics(data: AdCampaignData[]): PlatformMetric[] {
  const byPlatform = new Map<string, AdCampaignData[]>();
  for (const row of data) {
    if (!byPlatform.has(row.Channel_Used)) {
      byPlatform.set(row.Channel_Used, []);
    }
    byPlatform.get(row.Channel_Used)!.push(row);
  }

  const result: PlatformMetric[] = [];
  for (const [platform, rows] of byPlatform.entries()) {
    const metrics = computeMetrics(rows);
    result.push({
      platform,
      totalSpend: metrics.totalSpend,
      totalClicks: metrics.totalClicks,
      totalConversions: metrics.totalConversions,
      avgCtr: metrics.avgCtr,
      avgCpc: metrics.avgCpc,
      avgRoi: metrics.avgRoi,
    });
  }

  // Sort by Spend descending
  result.sort((a, b) => b.totalSpend - a.totalSpend);
  return result;
}
