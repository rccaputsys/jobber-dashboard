"use client";

import { SidebarNav } from "./SidebarNav";

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
  return (
    <div className="app-layout">
      <SidebarNav {...sidebarProps} adminConnectionId={adminConnectionId} />
      <div className="app-main">
        {children}
      </div>
    </div>
  );
}
