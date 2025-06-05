import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import ComponentCard from "../../components/common/ComponentCard";
import React from "react";
import StripeCard from "../../components/settings/payments/StripeCard";
import SquareCard from "../../components/settings/payments/SquareCard";
import PaypalCard from "../../components/settings/payments/PaypalCard";
import OtherMethodsCard from "../../components/settings/payments/OtherMethodsCard";
import HouseAccountsCard from "../../components/settings/payments/HouseAccountsCard";

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
