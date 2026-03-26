"use client";

import { SidebarNav } from "./SidebarNav";

export function DashboardLayout({ adminConnectionId, children }: {
  adminConnectionId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="app-layout">
      <SidebarNav adminConnectionId={adminConnectionId} />
      <div className="app-main">
        {children}
      </div>
    </div>
  );
}
