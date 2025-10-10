// src/pages/SettingsPage.tsx

import EmployeeSettingsCard from "@app/components/settings-old/EmployeeSettingsCard";
import MessageSuggestionsCard from "@app/components/settings-old/MessageSuggestionsCard";
import AddressShortcutsCard from "@app/components/settings-old/AddressShortcutsCard";





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