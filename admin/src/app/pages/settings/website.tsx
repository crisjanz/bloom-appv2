import PageBreadcrumb from "@shared/ui/common/PageBreadCrumb";
import ComponentCard from "@shared/ui/common/ComponentCard";

import WebsiteGeneralSettingsCard from "@app/components/settings/website/WebsiteGeneralSettingsCard";
import SEOCard from "@app/components/settings/website/SEOCard";
import SocialMediaCard from "@app/components/settings/website/SocialMediaCard";
import AnnouncementBannerCard from "@app/components/settings/website/AnnouncementBannerCard";
import FAQManagementCard from "@app/components/settings/website/FAQManagementCard";

const WebsitePage = () => (
  <div className="space-y-6">
    <PageBreadcrumb pageTitle="Website Settings" />
    <h2 className="text-2xl font-semibold text-black dark:text-white">Website Settings</h2>

    {/* General Website Settings */}
    <WebsiteGeneralSettingsCard />
    <SEOCard />
    <SocialMediaCard />
    <AnnouncementBannerCard />
    <FAQManagementCard />
  </div>
);

export default WebsitePage;
