"use client";

import { useState } from "react";
import { SidebarNav } from "./SidebarNav";
import { TargetsDrawer } from "./TargetsDrawer";

type Props = {
  adminConnectionId?: string;
  companyName?: string;
  connectionId?: string;
  lastSyncPretty?: string;
  billingStatus?: string;
  trialEndsAt?: number;
  subscriptionActive?: boolean;
  autoSync?: boolean;
  children: React.ReactNode;
};

export function DashboardLayout({ children, adminConnectionId, ...sidebarProps }: Props) {
  const [targetsOpen, setTargetsOpen] = useState(false);

  return (
    <div className="app-layout">
      <SidebarNav {...sidebarProps} adminConnectionId={adminConnectionId} onOpenTargets={() => setTargetsOpen(true)} />
      <div className="app-main">
        {children}
      </div>
      <TargetsDrawer open={targetsOpen} onClose={() => setTargetsOpen(false)} adminConnectionId={adminConnectionId} />
    </div>
  );
}
