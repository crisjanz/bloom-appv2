import PageBreadcrumb from "@shared/ui/common/PageBreadCrumb";
import ComponentCard from "@shared/ui/common/ComponentCard";

import BackupRestoreCard from "@app/components/settings/misc/BackupRestoreCard";
import ImportCard from "@app/components/settings/misc/ImportCard";
import ImportJsonCard from "@app/components/settings/misc/ImportJsonCard";
import TagManagerCard from "@app/components/settings/misc/TagManagerCard";

const MiscPage = () => (
  <div className="space-y-6">
    <PageBreadcrumb pageTitle="Misc Settings" />
    <h2 className="text-2xl font-semibold text-black dark:text-white">Misc Settings</h2>
    <TagManagerCard />
    <BackupRestoreCard />
    <ImportJsonCard />
    <ImportCard />
  </div>
);

export default MiscPage;
