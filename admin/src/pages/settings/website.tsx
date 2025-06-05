import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import ComponentCard from "../../components/common/ComponentCard";
import React from "react";
import WebsiteGeneralSettingsCard from "../../components/settings/website/WebsiteGeneralSettingsCard";
import SEOCard from "../../components/settings/website/SEOCard";
import SocialMediaCard from "../../components/settings/website/SocialMediaCard";

const WebsitePage = () => (
  <div className="space-y-6">
    <PageBreadcrumb pageName="Website Settings" />
    <h2 className="text-2xl font-semibold text-black dark:text-white">Website Settings</h2>
    <WebsiteGeneralSettingsCard />
    <SEOCard />
    <SocialMediaCard />
  </div>
);

export default WebsitePage;
