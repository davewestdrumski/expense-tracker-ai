"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useCloud } from "@/context/CloudContext";
import { DESTINATIONS } from "@/lib/cloud/destinations";
import { relativeTime } from "@/lib/cloud/schedule";
import type { DestinationId } from "@/lib/cloud/types";
import { Button, Card } from "../../ui";
import { ConnectDialog } from "../ConnectDialog";
import { DestinationTile, SimulatedBadge, StatusDot } from "../bits";

export function IntegrationsTab() {
  const { integrations, disconnect, setLiveSync, syncStatus } = useCloud();
  const [connecting, setConnecting] = useState<DestinationId | null>(null);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {DESTINATIONS.filter((d) => d.requiresConnection).map((d) => {
          const i = integrations[d.id];
          const connected = !!i?.connected;
          const live = d.id === "google-sheets" && connected ? i?.liveSync : null;
          return (
            <Card key={d.id} className="flex flex-col p-5">
              <div className="flex items-start gap-3">
                <DestinationTile id={d.id} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{d.name}</p>
                    <SimulatedBadge />
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">{d.description}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
                <StatusDot tone={connected ? (live && syncStatus.state === "syncing" ? "blue" : "green") : "slate"} />
                {connected ? (
                  <span>
                    Connected as <span className="font-medium">{i?.account}</span>
                    {i?.lastSyncAt ? ` · last activity ${relativeTime(i.lastSyncAt)}` : ""}
                  </span>
                ) : (
                  <span>Not connected</span>
                )}
              </div>
              {live && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 ring-1 ring-emerald-600/20">
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  <span className="flex-1">
                    Live sync → <span className="font-medium">{live.spreadsheet}</span> › {live.sheet}
                  </span>
                  <button type="button" onClick={() => setLiveSync(null)} className="font-semibold hover:underline">
                    Stop
                  </button>
                </div>
              )}
              <div className="mt-auto flex justify-end pt-4">
                {connected ? (
                  <Button variant="secondary" onClick={() => disconnect(d.id)}>
                    Disconnect
                  </Button>
                ) : (
                  <Button onClick={() => setConnecting(d.id)}>Connect</Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      {connecting && <ConnectDialog id={connecting} onClose={() => setConnecting(null)} />}
    </>
  );
}
