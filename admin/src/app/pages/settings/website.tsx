import PageBreadcrumb from "@shared/ui/common/PageBreadCrumb";
import ComponentCard from "@shared/ui/common/ComponentCard";

import WebsiteGeneralSettingsCard from "@app/components/settings/website/WebsiteGeneralSettingsCard";
import SEOCard from "@app/components/settings/website/SEOCard";
import SocialMediaCard from "@app/components/settings/website/SocialMediaCard";
import AnnouncementBannerCard from "@app/components/settings/website/AnnouncementBannerCard";
import HeroBannersCard from "@app/components/settings/website/HeroBannersCard";
import SeasonalProductsCard from "@app/components/settings/website/SeasonalProductsCard";
import FeaturedCategoriesCard from "@app/components/settings/website/FeaturedCategoriesCard";
import FAQManagementCard from "@app/components/settings/website/FAQManagementCard";

const WebsitePage = () => (
  <div className="space-y-6">
    <PageBreadcrumb pageTitle="Website Settings" />
    <h2 className="text-2xl font-semibold text-black dark:text-white">Website Settings</h2>

    {/* General Website Settings */}
    <WebsiteGeneralSettingsCard />
    <SEOCard />
    <SocialMediaCard />

    {/* Homepage Content Management */}
    <h2 className="text-2xl font-semibold text-black dark:text-white mt-8">Homepage Content</h2>
    <AnnouncementBannerCard />
    <HeroBannersCard />
    <SeasonalProductsCard />
    <FeaturedCategoriesCard />
    <FAQManagementCard />
  </div>
);

export default WebsitePage;
