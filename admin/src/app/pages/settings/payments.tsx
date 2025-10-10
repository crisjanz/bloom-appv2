import PageBreadcrumb from "@shared/ui/common/PageBreadcrumb";
import ComponentCard from "@shared/ui/common/ComponentCard";

import StripeCard from "@app/components/settings/payments/StripeCard";
import SquareCard from "@app/components/settings/payments/SquareCard";
import PaypalCard from "@app/components/settings/payments/PaypalCard";
import OtherMethodsCard from "@app/components/settings/payments/OtherMethodsCard";
import HouseAccountsCard from "@app/components/settings/payments/HouseAccountsCard";

const PaymentsPage = () => (
  <div className="space-y-6">
    <PageBreadcrumb pageName="Payments Settings" />
    <h2 className="text-2xl font-semibold text-black dark:text-white">Payments Settings</h2>
    <StripeCard />
    <SquareCard />
    <PaypalCard />
    <OtherMethodsCard />
    <HouseAccountsCard />
  </div>
);

export default PaymentsPage;
