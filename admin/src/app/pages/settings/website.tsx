import PageBreadcrumb from "@shared/ui/common/PageBreadCrumb";
import ComponentCard from "@shared/ui/common/ComponentCard";

import WebsiteGeneralSettingsCard from "@app/components/settings/website/WebsiteGeneralSettingsCard";
import SEOCard from "@app/components/settings/website/SEOCard";
import SocialMediaCard from "@app/components/settings/website/SocialMediaCard";

const WebsitePage = () => (
  <div className="space-y-6">
    <PageBreadcrumb pageTitle="Website Settings" />
    <h2 className="text-2xl font-semibold text-black dark:text-white">Website Settings</h2>
    <WebsiteGeneralSettingsCard />
    <SEOCard />
    <SocialMediaCard />
  </div>
);

export default WebsitePage;
