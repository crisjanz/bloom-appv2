import { useMemo, useState } from "react";
import logo from "../../assets/images/logo/logo.png";
import logoWhite from "../../assets/images/logo/logo-white.png";
import paymentImage from "../../assets/ecom-images/footers/footer-04/payment.svg";
import { Link } from "react-router-dom";
import useCategoriesTree from "../../hooks/useCategoriesTree.jsx";
import { buildCategoryUrl } from "../../utils/categoryTree";

const Footer = () => {
  const [openSection, setOpenSection] = useState(null);
  const { categories } = useCategoriesTree();

  const footerMenu = useMemo(() => {
    const infoSection = {
      title: "Information",
      items: [
        { text: "About Us", link: "#" },
        { text: "Order Tracking", link: "#" },
        { text: "Contact Us", link: "/contact" },
        { text: "FAQ", link: "/faq" },
        { text: "Terms & Conditions", link: "/terms" },
      ],
    };

    const categorySections = Array.isArray(categories)
      ? categories.map((category) => {
          const children = Array.isArray(category.children)
            ? category.children
            : [];
          const items = children.length
            ? [
                {
                  text: `All ${category.name}`,
                  link: buildCategoryUrl(category.slug),
                },
                ...children.map((child) => ({
                  text: child.name,
                  link: buildCategoryUrl(category.slug, child.slug),
                })),
              ]
            : [
                {
                  text: category.name,
                  link: buildCategoryUrl(category.slug),
                },
              ];

          const isGiftsCategory =
            category.slug?.toLowerCase() === "gifts" || category.name?.toLowerCase() === "gifts";
          const hasGiftCardsLink = items.some((item) => item.link === "/gift-cards");

          if (isGiftsCategory && !hasGiftCardsLink) {
            items.push({ text: "Gift Cards", link: "/gift-cards" });
          }

          return { title: category.name, items };
        })
      : [];

    return [infoSection, ...categorySections];
  }, [categories]);

  return (
    <>
      <footer className="bg-tg-bg dark:bg-dark-2">
        <div className="pt-8">
          <div className="container mx-auto">
            <div className="flex flex-wrap -mx-4">
              <div className="w-full px-4 md:w-1/2 lg:w-5/12 xl:w-4/12">
                <div className="mb-8 max-w-[270px]">
                  <Link to="/" className="inline-block mb-3">
                    <img
                      src={logo}
                      alt="logo"
                      className="w-40 dark:hidden"
                    />
                    <img
                      src={logoWhite}
                      alt="logo"
                      className="hidden w-40 dark:block"
                    />
                  </Link>

                  <div className="space-y-4">
                    <p className="flex text-sm text-body-color dark:text-dark-6">
                      <span className="pr-5 mt-1">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M20.7 7.12501H19.575C19.6875 6.82501 19.7625 6.48751 19.7625 6.11251V4.83751C19.7625 3.33751 18.5625 2.13751 17.0625 2.13751H3.37499C1.87499 2.13751 0.674988 3.33751 0.674988 4.83751V6.11251V19.2C0.674988 20.6625 1.83749 21.825 3.29999 21.825H20.7375C22.2 21.825 23.3625 20.6625 23.3625 19.2V9.75001C23.325 8.32501 22.1625 7.12501 20.7 7.12501ZM21.6375 16.5375H18.225C18.075 16.5375 17.925 16.3875 17.925 16.2375V12.75C17.925 12.6 18.075 12.45 18.225 12.45H21.6375V16.5375ZM2.36249 4.83751C2.36249 4.27501 2.81249 3.82501 3.37499 3.82501H17.1C17.6625 3.82501 18.1125 4.27501 18.1125 4.83751V6.11251C18.1125 6.67501 17.6625 7.12501 17.1 7.12501H3.37499C2.81249 7.12501 2.36249 6.67501 2.36249 6.11251V4.83751ZM20.7 20.175H3.29999C2.77499 20.175 2.36249 19.7625 2.36249 19.2375V8.62501C2.66249 8.73751 2.99999 8.81251 3.37499 8.81251H20.7375C21.2625 8.81251 21.675 9.22501 21.675 9.75001V10.7625H18.2625C17.175 10.7625 16.275 11.6625 16.275 12.75V16.2C16.275 17.2875 17.175 18.1875 18.2625 18.1875H21.675V19.2C21.6375 19.725 21.225 20.175 20.7 20.175Z"
                            fill="#597485"
                          />
                          <path
                            d="M19.875 15.1875C20.2685 15.1875 20.5875 14.8685 20.5875 14.475C20.5875 14.0815 20.2685 13.7625 19.875 13.7625C19.4815 13.7625 19.1625 14.0815 19.1625 14.475C19.1625 14.8685 19.4815 15.1875 19.875 15.1875Z"
                            fill="#597485"
                          />
                        </svg>
                      </span>

                      <span>4190 15th Ave, Prince George, BC</span>
                    </p>
                    <p className="flex items-center text-sm text-body-color dark:text-dark-6">
                      <span className="pr-5">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <g clipPath="url(#clip0_1006_31131)">
                            <path
                              d="M18.225 23.3625C17.2125 23.3625 16.05 23.1 14.775 22.6125C12.225 21.6 9.41252 19.65 6.90002 17.1375C4.38752 14.625 2.43752 11.8125 1.42502 9.22502C0.300023 6.45002 0.412523 4.16252 1.72502 2.88752C1.76252 2.85002 1.83752 2.81252 1.87502 2.77502L5.02502 0.900018C5.81252 0.450018 6.82502 0.675018 7.35002 1.42502L9.56252 4.72502C10.0875 5.51252 9.86252 6.56252 9.11252 7.08752L7.76252 8.02502C8.73752 9.60002 11.5125 13.4625 15.9375 16.2375L16.7625 15.0375C17.4 14.1375 18.4125 13.875 19.2375 14.4375L22.5375 16.65C23.2875 17.175 23.5125 18.1875 23.0625 18.975L21.1875 22.125C21.15 22.2 21.1125 22.2375 21.075 22.275C20.4 22.9875 19.425 23.3625 18.225 23.3625ZM2.85002 4.16252C2.13752 4.95002 2.17502 6.56252 3.00002 8.62502C3.93752 10.9875 5.73752 13.575 8.10002 15.9375C10.425 18.2625 13.05 20.0625 15.375 21C17.4 21.825 19.0125 21.8625 19.8375 21.15L21.6375 18.075C21.6375 18.0375 21.6375 18.0375 21.6375 18L18.3375 15.7875C18.3375 15.7875 18.2625 15.825 18.1875 15.9375L17.3625 17.1375C16.8375 17.8875 15.825 18.1125 15.075 17.625C10.35 14.7 7.42502 10.6125 6.37502 8.96252C5.88752 8.17502 6.07502 7.16252 6.82502 6.63752L8.17502 5.70002V5.66252L5.96252 2.36252C5.96252 2.32502 5.92502 2.32502 5.88752 2.36252L2.85002 4.16252Z"
                              fill="#597485"
                            />
                            <path
                              d="M21.975 10.6875C21.525 10.6875 21.1875 10.35 21.15 9.90003C20.85 6.11253 17.7375 3.07503 13.9125 2.81253C13.4625 2.77503 13.0875 2.40003 13.125 1.91253C13.1625 1.46253 13.5375 1.08753 14.025 1.12503C18.675 1.42503 22.4625 5.10003 22.8375 9.75003C22.875 10.2 22.5375 10.6125 22.05 10.65C22.05 10.6875 22.0125 10.6875 21.975 10.6875Z"
                              fill="#597485"
                            />
                            <path
                              d="M18.2625 11.025C17.85 11.025 17.475 10.725 17.4375 10.275C17.2125 8.25001 15.6375 6.67501 13.6125 6.41251C13.1625 6.37501 12.825 5.92501 12.8625 5.47501C12.9 5.02501 13.35 4.68751 13.8 4.72501C16.6125 5.06251 18.7875 7.23751 19.125 10.05C19.1625 10.5 18.8625 10.9125 18.375 10.9875C18.3 11.025 18.2625 11.025 18.2625 11.025Z"
                              fill="#597485"
                            />
                          </g>
                          <defs>
                            <clipPath id="clip0_1006_31131">
                              <rect width="24" height="24" fill="white" />
                            </clipPath>
                          </defs>
                        </svg>
                      </span>

                      <span>1 (250) 562-8273</span>
                    </p>
                    <p className="flex items-center text-sm text-body-color dark:text-dark-6">
                      <span className="pr-5">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M21 3.59998H3.00001C1.72501 3.59998 0.637512 4.64998 0.637512 5.96248V18.1125C0.637512 19.3875 1.68751 20.475 3.00001 20.475H21C22.275 20.475 23.3625 19.425 23.3625 18.1125V5.92498C23.3625 4.64998 22.275 3.59998 21 3.59998ZM21 5.28748C21.0375 5.28748 21.075 5.28748 21.1125 5.28748L12 11.1375L2.88751 5.28748C2.92501 5.28748 2.96251 5.28748 3.00001 5.28748H21ZM21 18.7125H3.00001C2.62501 18.7125 2.32501 18.4125 2.32501 18.0375V6.93748L11.1 12.5625C11.3625 12.75 11.6625 12.825 11.9625 12.825C12.2625 12.825 12.5625 12.75 12.825 12.5625L21.6 6.93748V18.075C21.675 18.45 21.375 18.7125 21 18.7125Z"
                            fill="#597485"
                          />
                        </svg>
                      </span>

                      <span>IYVflowers@gmail.com</span>
                    </p>
                  </div>
                </div>
              </div>

              {footerMenu.map((item, index) => (
                <div
                  key={item.title}
                  className="w-full px-4 sm:w-1/2 md:w-1/2 lg:w-3/12 xl:w-2/12"
                >
                  <div className="md:hidden">
                    <div className="border-t border-stroke dark:border-dark-3">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenSection(openSection === index ? null : index)
                        }
                        aria-expanded={openSection === index}
                        className="flex w-full items-center justify-between py-4 text-sm font-semibold text-dark transition hover:text-primary dark:text-white"
                      >
                        <span>{item.title}</span>
                        <svg
                          className={`h-4 w-4 text-body-color transition-transform ${openSection === index ? "rotate-180" : ""} dark:text-dark-6`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 9l6 6 6-6"
                          />
                        </svg>
                      </button>

                      {openSection === index && (
                        <ul className="pb-4 pl-1.5 space-y-2.5">
                          {item.items.map((menu) => (
                            <li key={menu.text}>
                              <Link
                                to={menu.link}
                                className="inline-block text-sm text-body-color hover:text-primary dark:text-dark-6"
                              >
                                {menu.text}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="hidden md:block">
                    <div className="mb-16">
                      <h3 className="mb-6 text-xl font-semibold text-dark dark:text-white">
                        {item.title}
                      </h3>

                      <ul className="space-y-2.5">
                        {item.items.map((menu) => (
                          <li key={menu.text}>
                            <Link
                              to={menu.link}
                              className="inline-block text-sm text-body-color hover:text-primary dark:text-dark-6"
                            >
                              {menu.text}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="py-8 border-t border-stroke dark:border-dark-3">
          <div className="container mx-auto">
            <div className="text-center">
              <div className="mb-5">
                <img
                  src={paymentImage}
                  alt="payment"
                  className="max-w-full mx-auto"
                />
              </div>
              <p className="text-sm text-body-color dark:text-dark-6">
                © 2025 In Your Vase Flowers. All Rights Reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
