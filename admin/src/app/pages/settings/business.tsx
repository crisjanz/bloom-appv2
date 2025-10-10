import PageBreadcrumb from "@shared/ui/common/PageBreadcrumb";
import ComponentCard from "@shared/ui/common/ComponentCard";

import StoreInfoCard from "@app/components/settings/business/StoreInfoCard";
import BusinessHoursCard from "@app/components/settings/business/BusinessHoursCard";
import HolidaysCard from "@app/components/settings/business/HolidaysCard";
import TaxCard from "@app/components/settings/business/TaxCard";
import TipSettingsCard from "@app/components/settings/business/TipSettingsCard";
import ReportingCategoriesCard from "@app/components/settings/business/ReportingCategoriesCard";
import EmployeeListCard from "@app/components/settings/business/EmployeeListCard";

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
