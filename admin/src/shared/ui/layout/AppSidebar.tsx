import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";

// Assume these icons are imported from an icon library
import {
  LinkIcon,
  TruckIcon,
  SettingsIcon,
  BoxCubeIcon,
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PieChartIcon,
  TableIcon,
  UserCircleIcon,
} from "@shared/assets/icons";
import { useSidebar } from "@app/contexts/SidebarContext";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean; icon?: React.ReactNode }[];
};

const navItems: NavItem[] = [
  {
    name: "Dashboard",
    icon: <GridIcon />,
    path: "/",
  },
  {
    name: "Take Order",
    icon: <ListIcon />,
    path: "/orders/new",
  },
  {
    name: "POS Terminal",
    icon: <GridIcon />,
    path: "/pos/fullscreen",
  },
  {
    name: "Orders",
    icon: <ListIcon />,
    path: "/orders",
    subItems: [
      { name: "Delivery", path: "/delivery", pro: false, icon: <TruckIcon /> },
    ],
  },
  {
    name: "Customers",
    icon: <UserCircleIcon />,
    path: "/customers",
  },
  {
    name: "Events",
    icon: <CalenderIcon />,
    path: "/events",
  },
  {
    name: "FTD Orders",
    icon: <TruckIcon />,
    path: "/ftd-orders",
    subItems: [
      { name: "FTD Live", path: "/ftd-live", pro: false, icon: <LinkIcon /> },
    ],
  },
  {
    name: "Calendar",
    icon: <CalenderIcon />,
    path: "/calendar",
  },
  {
    name: "Settings",
    icon: <SettingsIcon />,
    path: "/settings",
    subItems: [
      { name: "Gift Cards", path: "/gift-cards", pro: false, icon: <GridIcon /> },
      { name: "Discounts", path: "/discounts", pro: false, icon: <BoxCubeIcon /> },
    ],
  },
  {
    name: "Reports",
    icon: <PieChartIcon />,
    path: "/reports/sales",
    subItems: [
      { name: "Transactions", path: "/reports/transactions", pro: false, icon: <TableIcon /> },
      { name: "Tax Export", path: "/reports/tax-export", pro: false, icon: <TableIcon /> },
    ],
  },
  {
    name: "User Profile",
    icon: <UserCircleIcon />,
    path: "/profile",
  },
];

const othersItems: NavItem[] = [];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleMobileSidebar } = useSidebar();
  const location = useLocation();

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  // Close mobile sidebar when location changes
  useEffect(() => {
    if (isMobileOpen) {
      toggleMobileSidebar();
    }
  }, [location.pathname]); // Only depend on location.pathname

  useEffect(() => {
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? navItems : othersItems;
      items.forEach((nav, index) => {
        if (nav.subItems?.length) {
          if (nav.path && isActive(nav.path) && !submenuMatched) {
            setOpenSubmenu({
              type: menuType as "main" | "others",
              index,
            });
            submenuMatched = true;
          }

          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main" | "others",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-2">
      {items.map((nav, index) => {
        const hasSubItems = Boolean(nav.subItems?.length);
        const isSubmenuOpen =
          openSubmenu?.type === menuType && openSubmenu?.index === index;
        const isNavPathActive = nav.path ? isActive(nav.path) : false;
        const isAnySubItemActive =
          nav.subItems?.some((subItem) => isActive(subItem.path)) ?? false;
        const isItemActive =
          isNavPathActive || isAnySubItemActive || isSubmenuOpen;

        return (
          <li key={nav.name}>
            {hasSubItems ? (
              <div
                className={`menu-item group ${
                  isItemActive ? "menu-item-active" : "menu-item-inactive"
                } ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "lg:justify-start"
                }`}
              >
                <Link
                  to={nav.path ?? "#"}
                  className="flex items-center gap-3 flex-1"
                  onClick={(event) => {
                    if (!nav.path) {
                      event.preventDefault();
                      handleSubmenuToggle(index, menuType);
                      return;
                    }

                    setOpenSubmenu({ type: menuType, index });
                  }}
                >
                  <span
                    className={`menu-item-icon-size ${
                      isItemActive
                        ? "menu-item-icon-active"
                        : "menu-item-icon-inactive"
                    }`}
                  >
                    {nav.icon}
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className="menu-item-text">{nav.name}</span>
                  )}
                </Link>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleSubmenuToggle(index, menuType);
                    }}
                    className="ml-auto"
                  >
                    <ChevronDownIcon
                      className={`w-5 h-5 transition-transform duration-200 ${
                        isSubmenuOpen ? "rotate-180 text-brand-500" : ""
                      }`}
                    />
                  </button>
                )}
              </div>
            ) : (
              nav.path && (
                <Link
                  to={nav.path}
                  className={`menu-item group ${
                    isActive(nav.path)
                      ? "menu-item-active"
                      : "menu-item-inactive"
                  }`}
                >
                  <span
                    className={`menu-item-icon-size ${
                      isActive(nav.path)
                        ? "menu-item-icon-active"
                        : "menu-item-icon-inactive"
                    }`}
                  >
                    {nav.icon}
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className="menu-item-text">{nav.name}</span>
                  )}
                </Link>
              )
            )}
            {hasSubItems && (isExpanded || isHovered || isMobileOpen) && (
              <div
                ref={(el) => {
                  subMenuRefs.current[`${menuType}-${index}`] = el;
                }}
                className="overflow-hidden transition-all duration-300"
                style={{
                  height: isSubmenuOpen
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
                }}
              >
                <ul className="mt-2 space-y-1 ml-9">
                  {nav.subItems?.map((subItem) => (
                    <li key={subItem.name}>
                      <Link
                        to={subItem.path}
                        className={`menu-dropdown-item ${
                          isActive(subItem.path)
                            ? "menu-dropdown-item-active"
                            : "menu-dropdown-item-inactive"
                        } flex items-center gap-2`}
                      >
                        {subItem.icon && (
                          <span className="w-4 h-4 flex-shrink-0">
                            {subItem.icon}
                          </span>
                        )}
                        {subItem.name}
                        <span className="flex items-center gap-1 ml-auto">
                          {subItem.new && (
                            <span className="menu-dropdown-badge">new</span>
                          )}
                          {subItem.pro && (
                            <span className="menu-dropdown-badge">pro</span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-4 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200
        ${
          isExpanded || isMobileOpen
            ? "w-[232px]"
            : isHovered
            ? "w-[232px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-4 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link to="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <img
                className="dark:hidden"
                src="/images/logo/logo.svg"
                alt="Logo"
                width={200}
                height={20}
              />
              <img
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="Logo"
                width={150}
                height={40}
              />
            </>
          ) : (
            <img
              src="/images/logo/logo-icon.svg"
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>
            {othersItems.length > 0 && (
              <div>
                <h2
                  className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    "Others"
                  ) : (
                    <HorizontaLDots />
                  )}
                </h2>
                {renderMenuItems(othersItems, "others")}
              </div>
            )}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
