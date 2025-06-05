import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import ComponentCard from "../../components/common/ComponentCard";
import React from "react";
import CouponListCard from "../../components/settings/discounts/CouponListCard";
import GiftCardsCard from "../../components/settings/discounts/GiftCardsCard";
import ProductDiscountsCard from "../../components/settings/discounts/ProductDiscountsCard";

const DiscountsPage = () => (
  <div className="space-y-6">
    <PageBreadcrumb pageName="Discounts Settings" />
    <h2 className="text-2xl font-semibold text-black dark:text-white">Discounts Settings</h2>
    <CouponListCard />
    <GiftCardsCard />
    <ProductDiscountsCard />
  </div>
);

export default DiscountsPage;
