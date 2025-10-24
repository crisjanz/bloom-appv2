import PageBreadcrumb from "@shared/ui/common/PageBreadCrumb";
import ComponentCard from "@shared/ui/common/ComponentCard";

import DeliveryPickupTimesCard from "@app/components/settings/delivery/DeliveryPickupTimesCard";
import DeliveryChargesCard from "@app/components/settings/delivery/DeliveryChargesCard";
import WebsiteDeliverySettingsCard from "@app/components/settings/delivery/WebsiteDeliverySettingsCard";
import DeliveryTaxCard from "@app/components/settings/delivery/DeliveryTaxCard";

const DeliveryPage = () => (
  <div className="space-y-6">
    <PageBreadcrumb pageTitle="Delivery Settings" />
    <h2 className="text-2xl font-semibold text-black dark:text-white">Delivery Settings</h2>
    <DeliveryPickupTimesCard />
    <DeliveryChargesCard />
    <WebsiteDeliverySettingsCard />
    <DeliveryTaxCard />
  </div>
);

export default DeliveryPage;
