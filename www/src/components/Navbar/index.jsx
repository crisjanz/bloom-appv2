import logoPrimary from "../../assets/images/logo/logo-primary.svg";
import logoWhite from "../../assets/images/logo/logo-white.png";
import logoMobile from "../../assets/images/logo/logo-mobile.png";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import WishListDropdown from "./WishListDropdown.jsx";
import CartDropdown from "./CartDropdown.jsx";
import { useMemo, useState, useEffect, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useCart } from "../../contexts/CartContext.jsx";
import { getProducts } from "../../services/productService.js";
import { useNavigate } from "react-router-dom";
import useCategoriesTree from "../../hooks/useCategoriesTree.jsx";
import { buildCategoryUrl } from "../../utils/categoryTree";

const Navbar = () => {
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [mobileSubmenuOpen, setMobileSubmenuOpen] = useState(false);

  const [navbarOpen, setNavbarOpen] = useState(false);
  const navRef = useRef(null);
  const hamburgerRef = useRef(null);
  const accountRef = useRef(null);
  const searchRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { isAuthenticated, customer, logout } = useAuth();
  const { getCartCount } = useCart();
  const navigate = useNavigate();
  const { categories } = useCategoriesTree();

  const shopGroups = useMemo(() => {
    if (!Array.isArray(categories) || categories.length === 0) {
      return [
        {
          title: "Shop",
          link: "/shop",
          groupItems: [{ text: "Shop All", link: "/shop" }],
        },
      ];
    }

    return categories.map((category) => {
      const children = Array.isArray(category.children) ? category.children : [];
      const items = children.length
        ? [
            { text: `All ${category.name}`, link: buildCategoryUrl(category.slug) },
            ...children.map((child) => ({
              text: child.name,
              link: buildCategoryUrl(category.slug, child.slug),
            })),
          ]
        : [{ text: category.name, link: buildCategoryUrl(category.slug) }];

      const isGiftsCategory =
        category.slug?.toLowerCase() === "gifts" || category.name?.toLowerCase() === "gifts";
      const hasGiftCardsLink = items.some((item) => item.link === "/gift-cards");

      if (isGiftsCategory && !hasGiftCardsLink) {
        items.push({ text: "Gift Cards", link: "/gift-cards" });
      }

      return {
        title: category.name,
        link: buildCategoryUrl(category.slug),
        groupItems: items,
      };
    });
  }, [categories]);

  const navList = useMemo(
    () => [
      { link: "/", text: "Home" },
      {
        link: "/shop",
        text: "Shop",
        submenuGroup: shopGroups,
      },
      { link: "/contact", text: "Contact" },
    ],
    [shopGroups]
  );

  const handleSubmenuToggle = () => {
    setSubmenuOpen(!submenuOpen);
  };

  const handleNavbarToggle = () => {
    setNavbarOpen(!navbarOpen);
  };

  // Search products by name and description
  useEffect(() => {
    const searchProducts = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      try {
        const allProducts = await getProducts();
        const filtered = allProducts.filter(
          (p) =>
            p.isActive &&
            p.visibility !== 'POS_ONLY' &&
            (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.description?.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        setSearchResults(filtered.slice(0, 5)); // Limit to 5 results
        setShowSearchResults(true);
      } catch (error) {
        console.error('Search error:', error);
      }
    };

    const debounceTimer = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Close navbar when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      // Don't close if clicking on a search result
      if (event.target.closest('.search-result-item')) {
        return;
      }

      // Don't close menu if clicking hamburger (let toggle handle it)
      if (navRef.current && !navRef.current.contains(event.target) &&
          hamburgerRef.current && !hamburgerRef.current.contains(event.target)) {
        setNavbarOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
        setShowSearchResults(false);
      }
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(event.target)) {
        setMobileSearchOpen(false);
        setSearchQuery("");
        setSearchResults([]);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleProductClick = (productId) => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
    setSearchOpen(false);
    setMobileSearchOpen(false);
    navigate(`/product-details?id=${productId}`);
  };

  const getProductPrice = (product) => {
    // Use the price property from the API response (basePriceCents / 100)
    return product.price || 0;
  };

  return (
    <header className="w-full bg-white dark:bg-dark">
      {/* MOBILE APP-LIKE HEADER - Sticky */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-dark border-b border-stroke dark:border-dark-3">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <img
              src={logoMobile}
              alt="logo"
              className="h-8 w-auto"
            />
          </Link>

          {/* Icons Row */}
          <div className="flex items-center gap-5">
            {/* Search Icon - Mobile */}
            <div className="relative" ref={mobileSearchRef}>
              <button onClick={() => {
                setMobileSearchOpen(!mobileSearchOpen);
                if (mobileSearchOpen) {
                  setSearchQuery("");
                  setSearchResults([]);
                }
              }} aria-label="Search">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-dark dark:text-white"
                >
                  <path
                    d="M21.7099 20.29L17.9999 16.61C19.44 14.8144 20.1374 12.5353 19.9487 10.2413C19.76 7.94729 18.6996 5.81281 16.9854 4.27667C15.2713 2.74053 13.0337 1.91954 10.7328 1.98248C8.43194 2.04543 6.24263 2.98757 4.61505 4.61515C2.98747 6.24273 2.04533 8.43204 1.98239 10.7329C1.91944 13.0338 2.74043 15.2714 4.27657 16.9855C5.81271 18.6997 7.94719 19.7601 10.2412 19.9488C12.5352 20.1375 14.8143 19.4401 16.6099 18L20.2899 21.68C20.3829 21.7738 20.4935 21.8481 20.6153 21.8989C20.7372 21.9497 20.8679 21.9758 20.9999 21.9758C21.1319 21.9758 21.2626 21.9497 21.3845 21.8989C21.5063 21.8481 21.6169 21.7738 21.7099 21.68C21.8901 21.4936 21.9909 21.2444 21.9909 20.985C21.9909 20.7256 21.8901 20.4764 21.7099 20.29ZM10.9999 18C9.61544 18 8.26206 17.5895 7.11091 16.8203C5.95977 16.0511 5.06256 14.9579 4.53275 13.6788C4.00293 12.3997 3.86431 10.9922 4.13441 9.63437C4.4045 8.2765 5.07119 7.02922 6.05016 6.05025C7.02913 5.07128 8.27641 4.4046 9.63428 4.1345C10.9921 3.8644 12.3996 4.00303 13.6787 4.53284C14.9578 5.06266 16.051 5.95987 16.8202 7.11101C17.5894 8.26216 17.9999 9.61553 17.9999 11C17.9999 12.8565 17.2624 14.637 15.9497 15.9497C14.637 17.2625 12.8564 18 10.9999 18Z"
                    fill="currentColor"
                  />
                </svg>
              </button>

              {/* Mobile Search Dropdown */}
              {mobileSearchOpen && (
                <div className="fixed top-16 left-4 right-4 bg-white dark:bg-dark-2 border border-stroke dark:border-dark-3 rounded-lg shadow-lg p-3 z-50">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="w-full px-4 py-2 rounded-lg border border-stroke bg-white dark:bg-dark dark:border-dark-3 dark:text-white text-base focus:outline-none focus:border-primary mb-3"
                    autoFocus
                  />

                  {searchResults.length > 0 ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {searchResults.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => handleProductClick(product.id)}
                          className="search-result-item w-full flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-dark-3 rounded-lg transition text-left"
                        >
                          <img
                            src={product.images?.[0] || '/placeholder-image.jpg'}
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-dark dark:text-white truncate">
                              {product.name}
                            </p>
                            <p className="text-xs text-body-color dark:text-dark-6">
                              ${getProductPrice(product).toFixed(2)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : searchQuery.length >= 2 ? (
                    <p className="text-sm text-body-color dark:text-dark-6 text-center py-4">
                      No products found
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            {/* Cart Icon with Badge */}
            <Link to="/shopping-cart" aria-label="Shopping cart" className="relative">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-dark dark:text-white"
              >
                <path
                  d="M6 2L3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V6L18 2H6Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3 6H21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M16 10C16 11.0609 15.5786 12.0783 14.8284 12.8284C14.0783 13.5786 13.0609 14 12 14C10.9391 14 9.92172 13.5786 9.17157 12.8284C8.42143 12.0783 8 11.0609 8 10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {getCartCount() > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary h-5 w-5 rounded-full text-[10px] leading-5 font-semibold text-white flex items-center justify-center">
                  {getCartCount()}
                </span>
              )}
            </Link>

            {/* Hamburger Menu */}
            <button
              ref={hamburgerRef}
              onClick={handleNavbarToggle}
              aria-label="Menu"
              className="p-1"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-dark dark:text-white"
              >
                <path
                  d="M3 12H21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3 6H21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3 18H21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {navbarOpen && (
          <nav
            className="absolute top-full left-0 right-0 bg-white dark:bg-dark-2 border-t border-stroke dark:border-dark-3 shadow-lg"
            ref={navRef}
          >
            <ul className="py-2">
              {navList.map((item, index) => (
                <li key={index}>
                  {item.submenuGroup ? (
                    <>
                      <button
                        onClick={() => setMobileSubmenuOpen(!mobileSubmenuOpen)}
                        className="text-dark hover:bg-gray-100 dark:hover:bg-dark-3 hover:text-primary flex items-center justify-between w-full px-6 py-3 text-base font-medium dark:text-white"
                      >
                        {item.text}
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 15 15"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className={`fill-current transition-transform ${mobileSubmenuOpen ? 'rotate-180' : ''}`}
                        >
                          <path d="M7.39258 10.475C7.26133 10.475 7.15196 10.4313 7.04258 10.3438L2.01133 5.40001C1.81446 5.20314 1.81446 4.89689 2.01133 4.70001C2.20821 4.50314 2.51446 4.50314 2.71133 4.70001L7.39258 9.27189L12.0738 4.65626C12.2707 4.45939 12.577 4.45939 12.7738 4.65626C12.9707 4.85314 12.9707 5.15939 12.7738 5.35626L7.74258 10.3C7.63321 10.4094 7.52383 10.475 7.39258 10.475Z" />
                        </svg>
                      </button>
                      {mobileSubmenuOpen && (
                        <div className="bg-gray-50 dark:bg-dark px-6 py-2">
                          {item.submenuGroup.map((group, groupIndex) => (
                            <div key={groupIndex} className="py-2">
                              <Link
                                to={group.link || "/shop"}
                                onClick={() => {
                                  setNavbarOpen(false);
                                  setMobileSubmenuOpen(false);
                                }}
                                className="text-sm font-semibold text-dark dark:text-white mb-2 block hover:text-primary"
                              >
                                {group.title}
                              </Link>
                              {group.groupItems.map((groupItem, itemIndex) => (
                                <Link
                                  key={itemIndex}
                                  to={groupItem.link}
                                  onClick={() => {
                                    setNavbarOpen(false);
                                    setMobileSubmenuOpen(false);
                                  }}
                                  className="text-body-color hover:text-primary dark:text-dark-6 block py-1.5 text-sm"
                                >
                                  {groupItem.text}
                                </Link>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      to={item.link}
                      onClick={() => setNavbarOpen(false)}
                      className="text-dark hover:bg-gray-100 dark:hover:bg-dark-3 hover:text-primary block px-6 py-3 text-base font-medium dark:text-white"
                    >
                      {item.text}
                    </Link>
                  )}
                </li>
              ))}

              {/* Wishlist & Account Links in Mobile Menu */}
              <li className="border-t border-stroke dark:border-dark-3 mt-2 pt-2">
                <Link
                  to="/wishlist"
                  onClick={() => setNavbarOpen(false)}
                  className="text-dark hover:bg-gray-100 dark:hover:bg-dark-3 hover:text-primary flex items-center gap-3 px-6 py-3 text-base font-medium dark:text-white"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20.8401 4.60999C20.3294 4.09927 19.7229 3.69462 19.0555 3.41842C18.388 3.14221 17.6726 3 16.9501 3C16.2276 3 15.5122 3.14221 14.8448 3.41842C14.1773 3.69462 13.5709 4.09927 13.0601 4.60999L12.0001 5.66999L10.9401 4.60999C9.90843 3.5783 8.50915 2.9987 7.05012 2.9987C5.59109 2.9987 4.19181 3.5783 3.16012 4.60999C2.12843 5.64169 1.54883 7.04096 1.54883 8.49999C1.54883 9.95903 2.12843 11.3583 3.16012 12.39L4.22012 13.45L12.0001 21.23L19.7801 13.45L20.8401 12.39C21.3508 11.8792 21.7555 11.2728 22.0317 10.6053C22.3079 9.93789 22.4501 9.22248 22.4501 8.49999C22.4501 7.77751 22.3079 7.0621 22.0317 6.39464C21.7555 5.72718 21.3508 5.12075 20.8401 4.60999Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Wishlist
                </Link>
              </li>
              <li>
                {isAuthenticated ? (
                  <>
                    <Link
                      to="/profile"
                      onClick={() => setNavbarOpen(false)}
                      className="text-dark hover:bg-gray-100 dark:hover:bg-dark-3 hover:text-primary flex items-center gap-3 px-6 py-3 text-base font-medium dark:text-white"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M3 21C3 17.134 7.02944 14 12 14C16.9706 14 21 17.134 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      My Profile
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setNavbarOpen(false);
                        logout();
                      }}
                      className="text-dark hover:bg-gray-100 dark:hover:bg-dark-3 hover:text-primary flex items-center gap-3 w-full px-6 py-3 text-base font-medium dark:text-white text-left"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setNavbarOpen(false)}
                      className="text-dark hover:bg-gray-100 dark:hover:bg-dark-3 hover:text-primary flex items-center gap-3 px-6 py-3 text-base font-medium dark:text-white"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10 17L15 12L10 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Login
                    </Link>
                    <Link
                      to="/signup"
                      onClick={() => setNavbarOpen(false)}
                      className="text-dark hover:bg-gray-100 dark:hover:bg-dark-3 hover:text-primary flex items-center gap-3 px-6 py-3 text-base font-medium dark:text-white"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8.5 11C10.7091 11 12.5 9.20914 12.5 7C12.5 4.79086 10.7091 3 8.5 3C6.29086 3 4.5 4.79086 4.5 7C4.5 9.20914 6.29086 11 8.5 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M20 8V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M23 11H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Create Account
                    </Link>
                  </>
                )}
              </li>
            </ul>
          </nav>
        )}
      </div>

      {/* Add padding to body content so it doesn't hide under fixed header */}
      <div className="h-[56px] md:hidden"></div>

      {/* DESKTOP HEADER - Hidden on mobile */}
      <div className="hidden md:block">
        <div className="container mx-auto">
          <div className="relative flex items-center justify-center -mx-4 sm:justify-between">
            <div className="max-w-full px-4 w-[480px] lg:w-96">
              <Link to="/" className="block w-full py-10 lg:py-6">
                <img
                  src={logoPrimary}
                  alt="logo"
                  className="w-full dark:hidden"
                />
                <img
                  src={logoWhite}
                  alt="logo"
                  className="hidden w-full dark:block"
                />
              </Link>
            </div>

            <div className="flex items-center justify-end w-full px-4 lg:justify-between">
              <div className="flex items-center justify-between w-full px-4">
                <div className="w-full">
                  <nav
                    className="lg:static lg:flex lg:w-full lg:max-w-full lg:justify-end lg:bg-transparent lg:px-0 lg:py-0 lg:shadow-none dark:lg:bg-transparent"
                  >
                    <ul className="items-center block lg:flex">
                      {navList.map((item, index) =>
                        item.submenuGroup ? (
                          <li key={index} className="relative group lg:py-8">
                            <Link
                              to={item.link}
                              onClick={handleSubmenuToggle}
                              className="text-dark hover:text-primary group-hover:text-primary flex items-center justify-between py-4 text-lg font-medium lg:mx-6 lg:inline-flex lg:py-4 2xl:mx-[18px] dark:text-white"
                            >
                              {item.text}

                              <span className="pl-[6px]">
                                <svg
                                  width="15"
                                  height="15"
                                  viewBox="0 0 15 15"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="fill-current"
                                >
                                  <path d="M7.39258 10.475C7.26133 10.475 7.15196 10.4313 7.04258 10.3438L2.01133 5.40001C1.81446 5.20314 1.81446 4.89689 2.01133 4.70001C2.20821 4.50314 2.51446 4.50314 2.71133 4.70001L7.39258 9.27189L12.0738 4.65626C12.2707 4.45939 12.577 4.45939 12.7738 4.65626C12.9707 4.85314 12.9707 5.15939 12.7738 5.35626L7.74258 10.3C7.63321 10.4094 7.52383 10.475 7.39258 10.475Z" />
                                </svg>
                              </span>
                            </Link>
                            {submenuOpen && (
                              <div>
                                <div
                                  className={`dark:bg-dark-2 lg:border-stroke dark:lg:border-dark-3 relative top-full left-0 z-50 rounded-[5px] bg-white px-2 transition-all group-hover:opacity-100 lg:invisible lg:absolute lg:top-[115%] lg:w-[600px] lg:border-[.5px] lg:px-[50px] lg:pt-9 lg:pb-7 lg:opacity-0 lg:group-hover:visible lg:group-hover:top-full xl:w-[700px] ${submenuOpen ? "block" : "hidden lg:block"}`}
                                >
                                  <span className="border-stroke dark:border-dark-3 dark:bg-dark-2 absolute -top-[6px] left-8 -z-10 hidden h-3 w-3 rotate-45 rounded-xs border-[.5px] border-r-0 border-b-0 bg-white lg:block xl:left-10"></span>

                                  <div className="flex flex-wrap -mx-4 lg:justify-center">
                                    {item.submenuGroup.map(
                                      (group, groupIndex) => (
                                        <div
                                          key={groupIndex}
                                          className="w-full px-4 lg:w-1/3"
                                        >
                                          <div>
                                            <Link
                                              to={group.link || "/shop"}
                                              onClick={() => {
                                                setNavbarOpen(false);
                                                setSubmenuOpen(false);
                                              }}
                                              className="text-dark mb-[14px] text-base font-semibold dark:text-white block hover:text-primary"
                                            >
                                              {group.title}
                                            </Link>

                                            {group.groupItems.map(
                                              (groupItem, groupItemIndex) => (
                                                <Link
                                                  key={groupItemIndex}
                                                  to={groupItem.link}
                                                  onClick={() => {
                                                    setNavbarOpen(false);
                                                    setSubmenuOpen(false);
                                                  }}
                                                  className="text-body-color hover:text-primary dark:text-dark-6 block py-[6px] text-base"
                                                >
                                                  {groupItem.text}
                                                </Link>
                                              ),
                                            )}
                                          </div>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </li>
                        ) : (
                          <li key={index}>
                            <Link
                              to={item.link}
                              onClick={() => setNavbarOpen(false)}
                              className="text-dark hover:text-primary flex justify-between py-4 text-lg font-medium lg:mx-5 lg:inline-flex lg:py-12 2xl:mx-[18px] dark:text-white"
                            >
                              {item.text}
                            </Link>
                          </li>
                        ),
                      )}
                    </ul>
                  </nav>
                </div>
              </div>

              <div className="hidden w-full items-center justify-end space-x-4 pr-[70px] sm:flex lg:pr-0">

                {/* Search Button and Sliding Input */}
                <div className="relative" ref={searchRef}>
                  <div className="flex items-center">
                    {/* Sliding Search Input */}
                    <div className={`overflow-hidden transition-all duration-300 ${searchOpen ? 'w-64 mr-2' : 'w-0'}`}>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search products..."
                        className="w-full h-[42px] px-4 rounded-full border border-stroke bg-white dark:bg-dark-2 dark:border-dark-3 dark:text-white text-sm focus:outline-none focus:border-primary"
                      />
                    </div>

                    {/* Search Button */}
                    <button
                      onClick={() => setSearchOpen((prev) => !prev)}
                      className="border-stroke bg-gray-2 text-dark hover:border-primary hover:text-primary flex h-[42px] w-[42px] items-center justify-center rounded-full border transition dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                      aria-label="Search"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M21.7099 20.29L17.9999 16.61C19.44 14.8144 20.1374 12.5353 19.9487 10.2413C19.76 7.94729 18.6996 5.81281 16.9854 4.27667C15.2713 2.74053 13.0337 1.91954 10.7328 1.98248C8.43194 2.04543 6.24263 2.98757 4.61505 4.61515C2.98747 6.24273 2.04533 8.43204 1.98239 10.7329C1.91944 13.0338 2.74043 15.2714 4.27657 16.9855C5.81271 18.6997 7.94719 19.7601 10.2412 19.9488C12.5352 20.1375 14.8143 19.4401 16.6099 18L20.2899 21.68C20.3829 21.7738 20.4935 21.8481 20.6153 21.8989C20.7372 21.9497 20.8679 21.9758 20.9999 21.9758C21.1319 21.9758 21.2626 21.9497 21.3845 21.8989C21.5063 21.8481 21.6169 21.7738 21.7099 21.68C21.8901 21.4936 21.9909 21.2444 21.9909 20.985C21.9909 20.7256 21.8901 20.4764 21.7099 20.29ZM10.9999 18C9.61544 18 8.26206 17.5895 7.11091 16.8203C5.95977 16.0511 5.06256 14.9579 4.53275 13.6788C4.00293 12.3997 3.86431 10.9922 4.13441 9.63437C4.4045 8.2765 5.07119 7.02922 6.05016 6.05025C7.02913 5.07128 8.27641 4.4046 9.63428 4.1345C10.9921 3.8644 12.3996 4.00303 13.6787 4.53284C14.9578 5.06266 16.051 5.95987 16.8202 7.11101C17.5894 8.26216 17.9999 9.61553 17.9999 11C17.9999 12.8565 17.2624 14.637 15.9497 15.9497C14.637 17.2625 12.8564 18 10.9999 18Z"
                          fill="currentColor"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Desktop Search Results */}
                  {searchOpen && showSearchResults && searchResults.length > 0 && (
                    <div className="absolute top-full right-0 mt-2 w-96 bg-white dark:bg-dark-2 border border-stroke dark:border-dark-3 rounded-lg shadow-lg p-3 z-50">
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {searchResults.map((product) => (
                          <div
                            key={product.id}
                            onClick={() => handleProductClick(product.id)}
                            className="search-result-item w-full flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-dark-3 rounded-lg transition cursor-pointer"
                          >
                            <img
                              src={product.images?.[0] || '/placeholder-image.jpg'}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-dark dark:text-white truncate">
                                {product.name}
                              </p>
                              <p className="text-xs text-body-color dark:text-dark-6">
                                ${getProductPrice(product).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchOpen && showSearchResults && searchQuery.length >= 2 && searchResults.length === 0 && (
                    <div className="absolute top-full right-0 mt-2 w-96 bg-white dark:bg-dark-2 border border-stroke dark:border-dark-3 rounded-lg shadow-lg p-4 z-50">
                      <p className="text-sm text-body-color dark:text-dark-6 text-center">
                        No products found
                      </p>
                    </div>
                  )}
                </div>

                <div className="relative" ref={accountRef}>
                  <button
                    onClick={() => setAccountMenuOpen((prev) => !prev)}
                    className="border-stroke bg-gray-2 text-dark hover:border-primary hover:text-primary flex h-[42px] w-[42px] items-center justify-center rounded-full border transition dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                    aria-label="Account menu"
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 22 22"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="fill-current"
                    >
                      <path d="M11 9.62499C8.42188 9.62499 6.35938 7.59687 6.35938 5.12187C6.35938 2.64687 8.42188 0.618744 11 0.618744C13.5781 0.618744 15.6406 2.64687 15.6406 5.12187C15.6406 7.59687 13.5781 9.62499 11 9.62499ZM11 2.16562C9.28125 2.16562 7.90625 3.50624 7.90625 5.12187C7.90625 6.73749 9.28125 8.07812 11 8.07812C12.7188 8.07812 14.0938 6.73749 14.0938 5.12187C14.0938 3.50624 12.7188 2.16562 11 2.16562Z" />
                      <path d="M18.2531 21.4156C17.8406 21.4156 17.4625 21.0719 17.4625 20.625V19.6281C17.4625 16.0531 14.575 13.1656 11 13.1656C7.42499 13.1656 4.53749 16.0531 4.53749 19.6281V20.625C4.53749 21.0375 4.19374 21.4156 3.74686 21.4156C3.29999 21.4156 2.95624 21.0719 2.95624 20.625V19.6281C2.95624 15.1937 6.56561 11.6187 10.9656 11.6187C15.3656 11.6187 18.975 15.2281 18.975 19.6281V20.625C19.0094 21.0375 18.6656 21.4156 18.2531 21.4156Z" />
                    </svg>
                  </button>
                  {accountMenuOpen && (
                    <div className="dark:bg-dark-2 absolute right-0 z-50 mt-3 w-48 rounded-xl border border-stroke bg-white p-2 shadow-lg dark:border-dark-3">
                      {isAuthenticated ? (
                        <>
                          <Link
                            to="/profile"
                            className="text-body-color hover:bg-primary hover:text-white block rounded-lg px-3 py-2 text-sm font-medium transition dark:text-dark-6"
                            onClick={() => setAccountMenuOpen(false)}
                          >
                            My profile
                          </Link>
                          <button
                            type="button"
                            className="text-body-color hover:bg-primary hover:text-white block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition dark:text-dark-6"
                            onClick={() => {
                              setAccountMenuOpen(false);
                              logout();
                            }}
                          >
                            Logout
                          </button>
                        </>
                      ) : (
                        <>
                          <Link
                            to="/login"
                            className="text-body-color hover:bg-primary hover:text-white block rounded-lg px-3 py-2 text-sm font-medium transition dark:text-dark-6"
                            onClick={() => setAccountMenuOpen(false)}
                          >
                            Login
                          </Link>
                          <Link
                            to="/signup"
                            className="text-body-color hover:bg-primary hover:text-white block rounded-lg px-3 py-2 text-sm font-medium transition dark:text-dark-6"
                            onClick={() => setAccountMenuOpen(false)}
                          >
                            Create account
                          </Link>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <WishListDropdown />

                <CartDropdown />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

Navbar.propTypes = {
  navbarOpen: PropTypes.bool.isRequired,
  setNavbarOpen: PropTypes.func.isRequired,
};

export default Navbar;
