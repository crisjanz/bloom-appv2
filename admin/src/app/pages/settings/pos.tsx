import PageBreadcrumb from "@shared/ui/common/PageBreadcrumb";
import ComponentCard from "@shared/ui/common/ComponentCard";

import GridProductsCard from "@app/components/settings/pos/GridProductsCard";
import TBDCard from "@app/components/settings/pos/TBDCard";
import POSTabsCard from '@app/components/settings/pos/POSTabsCard';


const PosPage = () => (
  <div className="space-y-6">
    <PageBreadcrumb pageName="Pos Settings" />
    <h2 className="text-2xl font-semibold text-black dark:text-white">Pos Settings</h2>
    <GridProductsCard />
<POSTabsCard />
    <TBDCard />
  </div>
);

export default PosPage;
