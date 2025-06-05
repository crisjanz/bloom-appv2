import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import ComponentCard from "../../components/common/ComponentCard";
import React from "react";
import GeneralSettingsCard from "../../components/settings/orders/GeneralSettingsCard";
import MessageSuggestionsCard from "../../components/settings/orders/MessageSuggestionsCard";
import AddressShortcutsCard from "../../components/settings/orders/AddressShortcutsCard";
import LogicSettingsCard from "../../components/settings/orders/LogicSettingsCard";
import AddOnGroupsCard from "../../components/settings/orders/AddOnGroupsCard";

const OrdersPage = () => (
  <div className="space-y-6">
    <PageBreadcrumb pageName="Orders Settings" />
    <h2 className="text-2xl font-semibold text-black dark:text-white">Orders Settings</h2>
    <GeneralSettingsCard />
    <MessageSuggestionsCard />
    <AddressShortcutsCard />
    <LogicSettingsCard />
    <AddOnGroupsCard />
  </div>
);

export default OrdersPage;
