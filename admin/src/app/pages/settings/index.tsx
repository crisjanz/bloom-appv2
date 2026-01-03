
import { Link } from "react-router-dom";
import ComponentCard from "@shared/ui/common/ComponentCard";
import {
  LinkIcon,
  TruckIcon,
  SettingsIcon,
  BoxCubeIcon,
  CalenderIcon,
  GridIcon,
  PageIcon,
  PlugInIcon,
  ListIcon,
} from "@shared/assets/icons";

const settings = [
  { title: "Business General", desc: "Store info, tax, hours, employees", href: "/settings/business", icon: <SettingsIcon className="w-6 h-6 text-primary" /> },
  { title: "Payments", desc: "Stripe, Square, COD, house accounts", href: "/settings/payments", icon: <PlugInIcon className="w-6 h-6 text-primary" /> },
  { title: "Delivery / Pickup", desc: "Times, charges, website logic", href: "/settings/delivery", icon: <TruckIcon className="w-6 h-6 text-primary" /> },
  { title: "Notifications", desc: "SMS, email, templates", href: "/settings/notifications", icon: <GridIcon className="w-6 h-6 text-primary" /> },
  { title: "Orders", desc: "Toggles, add-ons, logic", href: "/settings/orders", icon: <BoxCubeIcon className="w-6 h-6 text-primary" /> },
  { title: "External Providers", desc: "Manage external order sources", href: "/settings/external-providers", icon: <LinkIcon className="w-6 h-6 text-primary" /> },
  { title: "Coupons & Discounts", desc: "Coupons, gift cards, sales", href: "/settings/discounts", icon: <PageIcon className="w-6 h-6 text-primary" /> },
  { title: "POS Settings", desc: "POS grid settings and TBD", href: "/settings/pos", icon: <GridIcon className="w-6 h-6 text-primary" /> },
  { title: "Print Settings", desc: "Tickets, layouts, printers", href: "/settings/print", icon: <GridIcon className="w-6 h-6 text-primary" /> },
  { title: "Event Manager", desc: "Event system logic (TBD)", href: "/settings/events", icon: <CalenderIcon className="w-6 h-6 text-primary" /> },
  { title: "Website Settings", desc: "SEO, social, general setup", href: "/settings/website", icon: <LinkIcon className="w-6 h-6 text-primary" /> },
  { title: "Miscellaneous", desc: "Tags, backup/restore", href: "/settings/misc", icon: <ListIcon className="w-6 h-6 text-primary" /> },
];

const SettingsIndexPage = () => (
  <ComponentCard title="Settings">
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
      {settings.map((s) => (
        <Link
          key={s.href}
          to={s.href}
          className="flex items-start gap-4 rounded-xl p-4 bg-white dark:bg-boxdark hover:shadow transition"
        >
          <div className="mt-1">{s.icon}</div>
          <div>
            <h3 className="text-base font-semibold text-black dark:text-white mb-0.5">{s.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{s.desc}</p>
          </div>
        </Link>
      ))}
    </div>
  </ComponentCard>
);

export default SettingsIndexPage;
