"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export interface ClientTab {
  value: string;
  label: string;
  content: React.ReactNode;
}

/**
 * Thin client shell for the Client 360 view. Each tab's content is rendered
 * server-side (so bank decryption / BigInt math stay on the server) and passed
 * in as already-built React nodes — this component only owns the tab chrome.
 */
export function ClientTabs({ tabs }: { tabs: ClientTab[] }) {
  return (
    <Tabs defaultValue={tabs[0]?.value ?? ""} className="space-y-4">
      <TabsList>
        {tabs.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.value} value={t.value}>
          {t.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
