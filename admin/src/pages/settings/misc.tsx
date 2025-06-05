import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import ComponentCard from "../../components/common/ComponentCard";
import React from "react";
import TagManagerCard from "../../components/settings/misc/TagManagerCard";
import BackupRestoreCard from "../../components/settings/misc/BackupRestoreCard";

const MiscPage = () => (
  <div className="space-y-6">
    <PageBreadcrumb pageName="Misc Settings" />
    <h2 className="text-2xl font-semibold text-black dark:text-white">Misc Settings</h2>
    <TagManagerCard />
    <BackupRestoreCard />
  </div>
);

export default MiscPage;
