import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import ComponentCard from "../../components/common/ComponentCard";
import React from "react";
import SMSGatewayCard from "../../components/settings/notifications/SMSGatewayCard";
import EmailSettingsCard from "../../components/settings/notifications/EmailSettingsCard";
import NotificationTemplatesCard from "../../components/settings/notifications/NotificationTemplatesCard";
import OrderStatusNotificationsCard from "../../components/settings/notifications/OrderStatusNotificationsCard";

const NotificationsPage = () => (
  <div className="space-y-6">
    <PageBreadcrumb pageName="Notifications Settings" />
    <h2 className="text-2xl font-semibold text-black dark:text-white">Notifications Settings</h2>
    <SMSGatewayCard />
    <EmailSettingsCard />
    <NotificationTemplatesCard />
    <OrderStatusNotificationsCard />
  </div>
);

export default NotificationsPage;
