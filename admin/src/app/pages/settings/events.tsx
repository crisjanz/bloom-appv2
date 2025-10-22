import PageBreadcrumb from "@shared/ui/common/PageBreadCrumb";
import ComponentCard from "@shared/ui/common/ComponentCard";

import TBDCard from "@app/components/settings/events/TBDCard";

const EventsPage = () => (
  <div className="space-y-6">
    <PageBreadcrumb pageName="Events Settings" />
    <h2 className="text-2xl font-semibold text-black dark:text-white">Events Settings</h2>
    <TBDCard />
  </div>
);

export default EventsPage;
