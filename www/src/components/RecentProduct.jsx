import { Link } from "react-router-dom";
import productOne from "/images/recent1.jpg";
import productTwo from "/images/recent2.jpg";

const collections = [
  {
    imageSrc: productOne,
    subtitle: "From $90",
    title: "Victorian Garden",
    description:
      "Show your appreciation with this arrangement straight out of a classic English garden, including hydrangea and viburnum.",
    link: "/product-details?id=a7a2d094-b724-44df-b1ef-f2452070de49",
  },
  {
    imageSrc: productTwo,
    subtitle: "From $75",
    title: "Pretty in Purple",
    description:
      "A charming little bouquet of purple flowers in a cute cube vase.",
    link: "/product-details?id=88f36f80-a61b-4b05-9371-8f042f0017a5",
  },
];

const RecentProduct = () => {
  return (
    <>
      <section className="pb-12 pt-10 dark:bg-dark lg:pb-[90px] lg:pt-[60px]">
        <div className="container mx-auto">
          {collections.map((collection, index) => (
            <div key={index} className="mb-12 last:mb-5">
              {/* Mobile Layout: Title, Price, Image, Description, Button */}
              <div className="block sm:hidden px-4">
                <h2 className="mb-3 text-2xl font-semibold leading-tight text-dark dark:text-white">
                  {collection.title}
                </h2>
                <span className="mb-4 block text-lg font-semibold text-primary">
                  {collection.subtitle}
                </span>
                <div className="mb-4">
                  <img
                    src={collection.imageSrc}
                    alt="Recent Product"
                    className="w-full rounded-lg"
                  />
                </div>
                <p className="mb-6 text-base text-body-color dark:text-dark-6">
                  {collection.description}
                </p>
                <Link
                  to={collection.link}
                  className="inline-flex items-center justify-center rounded-md bg-primary px-7 py-[13px] text-center text-base font-medium text-white hover:bg-primary-dark w-full"
                >
                  Shop Now
                </Link>
              </div>

              {/* Desktop Layout: Alternating sides */}
              <div className={`hidden sm:flex group -mx-4 flex-wrap items-center justify-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                <div className="w-full px-4 lg:w-1/2 2xl:w-5/12">
                  <div className="mb-12 max-w-[465px] lg:mb-0 lg:group-even:ml-auto">
                    <h2 className="mb-5 text-2xl font-semibold leading-tight! text-dark dark:text-white xl:text-4xl">
                      {collection.title}
                    </h2>
                    <span className="mb-4 block text-lg font-semibold text-primary md:text-2xl">
                      {collection.subtitle}
                    </span>
                    <p className="mb-9 text-base text-body-color dark:text-dark-6">
                      {collection.description}
                    </p>
                    <Link
                      to={collection.link}
                      className="inline-flex items-center justify-center rounded-md bg-primary px-7 py-[13px] text-center text-base font-medium text-white hover:bg-primary-dark"
                    >
                      Shop Now
                    </Link>
                  </div>
                </div>
                <div className="w-full px-4 lg:w-1/2 2xl:w-5/12">
                  <div>
                    <img
                      src={collection.imageSrc}
                      alt="Recent Product"
                      className="w-full rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};

export default RecentProduct;
