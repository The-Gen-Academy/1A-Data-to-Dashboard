import { useState, useEffect } from "react";
import { Sidebar } from "../components/Sidebar";
import { useAdData } from "../hooks/useAdData";
import { OverviewTab } from "../components/tabs/OverviewTab";
import { PlatformTab } from "../components/tabs/PlatformTab";
import { CampaignTab } from "../components/tabs/CampaignTab";
import { TrendsTab } from "../components/tabs/TrendsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sun, Moon, Printer } from "lucide-react";

export default function Dashboard() {
  const {
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
  } = useAdData();

  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans">
      <Sidebar
        filters={filters}
        setFilters={setFilters}
        availableChannels={availableChannels}
        availableGoals={availableGoals}
        availableSegments={availableSegments}
        dateBounds={dateBounds}
        resetFilters={resetFilters}
        onFileUpload={handleFileUpload}
      />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between border-b border-border bg-card">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ad Campaign Performance</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Analyze your marketing spend, conversions, and ROI across all channels.
            </p>
          </div>
          
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center w-8 h-8 rounded-md transition-colors hover:bg-muted"
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F0F1F2",
                color: isDark ? "#c8c9cc" : "#4b5563",
              }}
              aria-label="Export as PDF"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsDark((d) => !d)}
              className="flex items-center justify-center w-8 h-8 rounded-md transition-colors hover:bg-muted"
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F0F1F2",
                color: isDark ? "#c8c9cc" : "#4b5563",
              }}
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-muted/20">
          <div className="max-w-[1400px] mx-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                Loading campaign data...
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-64 text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                <p>{error}</p>
              </div>
            ) : (
              <Tabs defaultValue="overview" className="w-full">
                <div className="mb-4 flex items-center justify-between">
                  <TabsList className="bg-card border border-border">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="platform">Platform Performance</TabsTrigger>
                    <TabsTrigger value="campaign">Campaign Deep-Dive</TabsTrigger>
                    <TabsTrigger value="trends">Trends Over Time</TabsTrigger>
                  </TabsList>
                  <div className="text-sm text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{filteredData.length}</span> campaigns
                  </div>
                </div>

                <TabsContent value="overview" className="mt-0 outline-none">
                  <OverviewTab data={filteredData} />
                </TabsContent>
                
                <TabsContent value="platform" className="mt-0 outline-none">
                  <PlatformTab data={filteredData} />
                </TabsContent>
                
                <TabsContent value="campaign" className="mt-0 outline-none">
                  <CampaignTab data={filteredData} />
                </TabsContent>

                <TabsContent value="trends" className="mt-0 outline-none">
                  <TrendsTab data={filteredData} />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
