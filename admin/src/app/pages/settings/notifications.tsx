import PageBreadcrumb from "@shared/ui/common/PageBreadCrumb";
import ComponentCard from "@shared/ui/common/ComponentCard";

import NotificationTemplatesCard from "@app/components/settings/notifications/NotificationTemplatesCard";
import OrderStatusNotificationsCard from "@app/components/settings/notifications/OrderStatusNotificationsCard";
import ReminderSettingsCard from "@app/components/settings/notifications/ReminderSettingsCard";

const NotificationsPage = () => (
  <div className="space-y-6">
    <PageBreadcrumb pageTitle="Notifications Settings" />
    <h2 className="text-2xl font-semibold text-black dark:text-white">Notifications Settings</h2>
    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
      Configure email/SMS credentials in <a href="/settings/email" className="text-brand-500 hover:underline">Email & SMS Settings</a>
    </p>
    <NotificationTemplatesCard />
    <OrderStatusNotificationsCard />
    <ReminderSettingsCard />
  </div>
);

export default NotificationsPage;
