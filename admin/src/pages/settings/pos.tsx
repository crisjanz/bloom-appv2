import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import ComponentCard from "../../components/common/ComponentCard";
import React from "react";
import GridProductsCard from "../../components/settings/pos/GridProductsCard";
import TBDCard from "../../components/settings/pos/TBDCard";

const PosPage = () => (
  <div className="space-y-6">
    <PageBreadcrumb pageName="Pos Settings" />
    <h2 className="text-2xl font-semibold text-black dark:text-white">Pos Settings</h2>
    <GridProductsCard />
    <TBDCard />
  </div>
);

export default PosPage;
