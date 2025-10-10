import PageBreadcrumb from "@shared/ui/common/PageBreadcrumb";
import ComponentCard from "@shared/ui/common/ComponentCard";

import SMSGatewayCard from "@app/components/settings/notifications/SMSGatewayCard";
import EmailSettingsCard from "@app/components/settings/notifications/EmailSettingsCard";
import NotificationTemplatesCard from "@app/components/settings/notifications/NotificationTemplatesCard";
import OrderStatusNotificationsCard from "@app/components/settings/notifications/OrderStatusNotificationsCard";

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
