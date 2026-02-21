import React from "react";
import { Alert } from "react-native";
import { logoutRole } from "../lib/api-client";
import { useSessionStore } from "../store/session-store";
import type { AppRole } from "../types";
import { HolderTabs } from "../navigation/holder-tabs";
import { IssuerTabs } from "../navigation/issuer-tabs";
import { RecruiterTabs } from "../navigation/recruiter-tabs";

export function HomeShellScreen() {
  const activeRole = useSessionStore((s) => s.activeRole);
  const setActiveRole = useSessionStore((s) => s.setActiveRole);

  if (!activeRole) {
    return null;
  }
  const role = activeRole as AppRole;

  async function onLogout() {
    try {
      await logoutRole(role);
    } catch (error: any) {
      Alert.alert(
        "Logout warning",
        error?.message || "Session was cleared locally.",
      );
    }
  }

  const commonProps = {
    onSwitchRole: () => setActiveRole(null),
    onLogout,
  };

  if (role === "holder") {
    return <HolderTabs {...commonProps} />;
  }
  if (role === "issuer") {
    return <IssuerTabs {...commonProps} />;
  }

  return <RecruiterTabs {...commonProps} />;
}
