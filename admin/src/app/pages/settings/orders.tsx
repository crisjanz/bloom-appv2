import PageBreadcrumb from "@shared/ui/common/PageBreadCrumb";
import ComponentCard from "@shared/ui/common/ComponentCard";

import GeneralSettingsCard from "@app/components/settings/orders/GeneralSettingsCard";
import MessageSuggestionsCard from "@app/components/settings/orders/MessageSuggestionsCard";
import AddressShortcutsCard from "@app/components/settings/orders/AddressShortcutsCard";
import LogicSettingsCard from "@app/components/settings/orders/LogicSettingsCard";
import AddOnGroupsCard from "@app/components/settings/orders/AddOnGroupsCard";

const OrdersPage = () => (
  <div className="space-y-6">
    <PageBreadcrumb pageTitle="Orders Settings" />
    <h2 className="text-2xl font-semibold text-black dark:text-white">Orders Settings</h2>
    <GeneralSettingsCard />
    <MessageSuggestionsCard />
    <AddressShortcutsCard />
    <LogicSettingsCard />
    <AddOnGroupsCard />
  </div>
);

export default OrdersPage;
