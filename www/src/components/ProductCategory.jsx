import productOne from "/images/cat1.jpg";
import productTwo from "/images/cat2.jpg";
import productThree from "/images/cat3.jpg";
import productFour from "/images/cat4.jpg";
import { Link } from "react-router-dom";

const productItems = [
  {
    image: productOne,
    link: "/shop",
    title: "Fresh Flowers",
    subtitle: "8 Products Available",
  },
  {
    image: productTwo,
    link: "/occasions/houseplants",
    title: "House Plants",
    subtitle: "4 Products Available",
  },
  {
    image: productThree,
    link: "/occasions/gifts",
    title: "Gifts",
    subtitle: "12 Products Available",
  },
  {
    image: productFour,
    link: "#",
    title: "Weddings",
    subtitle: "24 Products Available",
  },
];

const ProductCategory = () => {
  return (
    <>
      <section className="bg-tg-bg pb-12 pt-10 dark:bg-dark-2 lg:pb-[90px] lg:pt-[60px]">
        <div className="container mx-auto">
          <div className="-mx-4 flex">
            <div className="w-full px-4">
              <div className="mx-auto mb-[40px] max-w-[510px] text-center">
                <h2 className="mb-4 text-3xl font-bold leading-[1.2] text-dark dark:text-white sm:text-4xl md:text-[40px]">
                  Shop By Category
                </h2>
                <p className="text-base text-body-color dark:text-dark-6">
                  There are many variations of passages of Lorem Ipsum available
                  but the majority have suffered alteration in some form.
                </p>
              </div>
            </div>
          </div>

          <div className="-mx-4 flex flex-wrap">
            {productItems.map((item, index) => (
              <div key={index} className="w-1/2 px-4 sm:w-1/2 lg:w-1/4">
                <Link to={item.link} className="group mb-10 block text-center">
                  <div className="mb-5 overflow-hidden rounded-lg">
                    <img src={item.image} alt="category" className="w-full" />
                  </div>
                  <h3 className="mb-1 text-xl font-semibold text-dark group-hover:text-primary dark:text-white md:text-2xl lg:text-xl xl:text-2xl">
                    {item.title}
                  </h3>
                  <p className="text-base text-body-color dark:text-dark-6">
                    {item.subtitle}
                  </p>
                </Link>
              </div>
            ))}
          </div>

        </div>
      </section>
    </>
  );
};

export default ProductCategory;
