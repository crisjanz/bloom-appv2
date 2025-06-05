import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import ComponentCard from "../../components/common/ComponentCard";
import React from "react";
import TicketLayoutCard from "../../components/settings/print/TicketLayoutCard";
import PrintersCard from "../../components/settings/print/PrintersCard";
import ReportsLayoutsCard from "../../components/settings/print/ReportsLayoutsCard";
import PrintServerCard from "../../components/settings/print/PrintServerCard";

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
