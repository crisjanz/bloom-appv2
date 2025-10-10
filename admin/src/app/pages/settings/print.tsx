import PageBreadcrumb from "@shared/ui/common/PageBreadcrumb";
import ComponentCard from "@shared/ui/common/ComponentCard";

import TicketLayoutCard from "@app/components/settings/print/TicketLayoutCard";
import PrintersCard from "@app/components/settings/print/PrintersCard";
import ReportsLayoutsCard from "@app/components/settings/print/ReportsLayoutsCard";
import PrintServerCard from "@app/components/settings/print/PrintServerCard";

const PrintPage = () => (
  <div className="space-y-6">
    <PageBreadcrumb pageName="Print Settings" />
    <h2 className="text-2xl font-semibold text-black dark:text-white">Print Settings</h2>
    <TicketLayoutCard />
    <PrintersCard />
    <ReportsLayoutsCard />
    <PrintServerCard />
  </div>
);

export default PrintPage;
