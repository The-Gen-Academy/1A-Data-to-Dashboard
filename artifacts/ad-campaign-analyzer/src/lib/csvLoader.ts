import Papa from "papaparse";
import { format, parseISO } from "date-fns";

export interface AdCampaignData {
  Campaign_ID: string;
  Company: string;
  Campaign_Goal: string;
  Target_Audience: string;
  Customer_Segment: string;
  Duration_Days: number;
  Channel_Used: string;
  Conversion_Rate: number;
  Spend: number;
  ROI: number;
  Date: Date;
  DateStr: string;
  Clicks: number;
  Impressions: number;
  Conversions: number;
}

export function cleanRow(row: any): AdCampaignData | null {
  try {
    if (!row.Campaign_ID || !row.Date) return null;

    // Clean Spend / Acquisition_Cost
    let spend = 0;
    if (typeof row.Acquisition_Cost === "string") {
      spend = parseFloat(row.Acquisition_Cost.replace(/[$,]/g, ""));
    } else if (typeof row.Acquisition_Cost === "number") {
      spend = row.Acquisition_Cost;
    }

    // Clean Duration
    let durationDays = 0;
    if (typeof row.Duration === "string") {
      const match = row.Duration.match(/(\d+)/);
      if (match) durationDays = parseInt(match[1], 10);
    } else if (typeof row.Duration === "number") {
      durationDays = row.Duration;
    }

    // Clean Date
    let dateObj = new Date();
    let dateStr = "";
    if (typeof row.Date === "string") {
      dateObj = parseISO(row.Date);
      dateStr = row.Date;
    }

    const clicks = parseInt(row.Clicks) || 0;
    const impressions = parseInt(row.Impressions) || 0;
    const conversionRate = parseFloat(row.Conversion_Rate) || 0;
    const roi = parseFloat(row.ROI) || 0;
    
    // Derive Conversions
    const conversions = Math.round(clicks * conversionRate);

    return {
      Campaign_ID: String(row.Campaign_ID),
      Company: String(row.Company || ""),
      Campaign_Goal: String(row.Campaign_Goal || ""),
      Target_Audience: String(row.Target_Audience || ""),
      Customer_Segment: String(row.Customer_Segment || ""),
      Duration_Days: durationDays,
      Channel_Used: String(row.Channel_Used || ""),
      Conversion_Rate: conversionRate,
      Spend: spend,
      ROI: roi,
      Date: dateObj,
      DateStr: dateStr,
      Clicks: clicks,
      Impressions: impressions,
      Conversions: conversions,
    };
  } catch (e) {
    return null;
  }
}

export function parseCsvFile(file: File): Promise<AdCampaignData[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: false,
      skipEmptyLines: true,
      complete: (results) => {
        const cleaned = results.data
          .map(cleanRow)
          .filter((row): row is AdCampaignData => row !== null);
        resolve(cleaned);
      },
      error: (error) => reject(error),
    });
  });
}

export function loadDefaultCsv(): Promise<AdCampaignData[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(import.meta.env.BASE_URL + "social_media_advertising_sample.csv", {
      download: true,
      header: true,
      dynamicTyping: false,
      skipEmptyLines: true,
      complete: (results) => {
        const cleaned = results.data
          .map(cleanRow)
          .filter((row): row is AdCampaignData => row !== null);
        resolve(cleaned);
      },
      error: (error) => reject(error),
    });
  });
}
