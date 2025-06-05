import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import ComponentCard from "../../components/common/ComponentCard";
import React from "react";
import TBDCard from "../../components/settings/events/TBDCard";

const EventsPage = () => (
  <div className="space-y-6">
    <PageBreadcrumb pageName="Events Settings" />
    <h2 className="text-2xl font-semibold text-black dark:text-white">Events Settings</h2>
    <TBDCard />
  </div>
);

export default EventsPage;
