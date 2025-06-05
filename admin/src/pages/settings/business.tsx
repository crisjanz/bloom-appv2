import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import ComponentCard from "../../components/common/ComponentCard";
import React from "react";
import StoreInfoCard from "../../components/settings/business/StoreInfoCard";
import BusinessHoursCard from "../../components/settings/business/BusinessHoursCard";
import HolidaysCard from "../../components/settings/business/HolidaysCard";
import TaxCard from "../../components/settings/business/TaxCard";
import TipSettingsCard from "../../components/settings/business/TipSettingsCard";
import ReportingCategoriesCard from "../../components/settings/business/ReportingCategoriesCard";
import EmployeeListCard from "../../components/settings/business/EmployeeListCard";

const BusinessPage = () => (
  <div className="space-y-6">
    <PageBreadcrumb pageName="Business Settings" />
    <h2 className="text-2xl font-semibold text-black dark:text-white">Business Settings</h2>
    <StoreInfoCard />
    <BusinessHoursCard />
    <HolidaysCard />
    <TaxCard />
    <TipSettingsCard />
    <ReportingCategoriesCard />
    <EmployeeListCard />
  </div>
);

export default BusinessPage;
