import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import ComponentCard from "../../components/common/ComponentCard";
import React from "react";
import DeliveryPickupTimesCard from "../../components/settings/delivery/DeliveryPickupTimesCard";
import DeliveryChargesCard from "../../components/settings/delivery/DeliveryChargesCard";
import WebsiteDeliverySettingsCard from "../../components/settings/delivery/WebsiteDeliverySettingsCard";
import DeliveryTaxCard from "../../components/settings/delivery/DeliveryTaxCard";

const DeliveryPage = () => (
  <div className="space-y-6">
    <PageBreadcrumb pageName="Delivery Settings" />
    <h2 className="text-2xl font-semibold text-black dark:text-white">Delivery Settings</h2>
    <DeliveryPickupTimesCard />
    <DeliveryChargesCard />
    <WebsiteDeliverySettingsCard />
    <DeliveryTaxCard />
  </div>
);

export default DeliveryPage;
