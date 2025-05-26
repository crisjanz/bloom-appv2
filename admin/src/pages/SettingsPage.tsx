// src/pages/SettingsPage.tsx
import React from "react";
import EmployeeSettingsCard from "../components/settings/EmployeeSettingsCard";
import MessageSuggestionsCard from "../components/settings/MessageSuggestionsCard";
import AddressShortcutsCard from "../components/settings/AddressShortcutsCard";





const SettingsPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-4">Settings</h1>

      <EmployeeSettingsCard />

      <MessageSuggestionsCard />

      <AddressShortcutsCard />
    </div>
  );
};

export default SettingsPage;