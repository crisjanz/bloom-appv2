import Breadcrumb from "../components/Breadcrumb.jsx";

const contactInfo = {
  phone: "+1 (250) 562-8273",
  email: "info@bloomflowers.com",
  address: "123 Main St, Vancouver, BC V6B 1A1",
};

const Contact = () => {
  return (
    <>
      <Breadcrumb pageName="Contact" />

      <section className="relative z-10 overflow-hidden bg-tg-bg py-20 dark:bg-dark lg:py-[120px]">
        <div className="container mx-auto">
          <div className="-mx-4 flex flex-wrap items-top">
            <div className="w-full px-4 lg:w-1/2 xl:w-5/12">
              <div className="w-full max-w-[435px]">
                <h2 className="text-dark mb-5 text-4xl font-bold leading-[1.2] dark:text-white sm:text-5xl md:text-[60px]">
                  Let’s get in touch with us
                </h2>
                <p className="text-lg font-medium text-body-color dark:text-dark-6">
                  Email, call, or complete the form to connect with Bloom—our
                  team responds within 24 hours.
                </p>
              </div>

              <div className="mt-12 space-y-6">
                <div>
                  <p className="text-base text-body-color dark:text-dark-6">
                    Phone
                  </p>
                  <a
                    href={`tel:${contactInfo.phone.replace(/[^0-9+]/g, "")}`}
                    className="text-base font-medium text-dark hover:text-primary dark:text-white"
                  >
                    {contactInfo.phone}
                  </a>
                </div>
                <div>
                  <p className="text-base text-body-color dark:text-dark-6">
                    Email
                  </p>
                  <a
                    href={`mailto:${contactInfo.email}`}
                    className="text-base font-medium text-dark hover:text-primary dark:text-white"
                  >
                    {contactInfo.email}
                  </a>
                </div>
                <div>
                  <p className="text-base text-body-color dark:text-dark-6">
                    Studio
                  </p>
                  <p className="text-base font-medium text-dark dark:text-white">
                    {contactInfo.address}
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full px-4 lg:w-1/2 xl:w-7/12">
              <div className="rounded-[20px] bg-white p-8 shadow-xl dark:bg-dark-2 sm:p-[52px] lg:p-8 xl:ml-16 xl:p-[52px]">
                <h3 className="text-dark mb-3 text-3xl font-bold dark:text-white">
                  Get in Touch
                </h3>
                <p className="text-lg text-body-color dark:text-dark-6 mb-10">
                  Tell us what you’re planning and we’ll follow up quickly.
                </p>

                <form className="-mx-4 flex flex-wrap">
                  <div className="w-full px-4 sm:w-1/2">
                    <div className="mb-6">
                      <label
                        htmlFor="firstName"
                        className="text-dark mb-2.5 block text-base font-medium dark:text-white"
                      >
                        First name
                      </label>
                      <input
                        id="firstName"
                        type="text"
                        placeholder="First name"
                        className="w-full rounded-lg border border-stroke bg-transparent px-5 py-3 text-dark placeholder-dark-5 outline-hidden duration-200 focus:border-primary dark:border-dark-3 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="w-full px-4 sm:w-1/2">
                    <div className="mb-6">
                      <label
                        htmlFor="lastName"
                        className="text-dark mb-2.5 block text-base font-medium dark:text-white"
                      >
                        Last name
                      </label>
                      <input
                        id="lastName"
                        type="text"
                        placeholder="Last name"
                        className="h-[50px] w-full rounded-lg border border-stroke bg-transparent px-5 py-3 text-dark placeholder-dark-5 outline-hidden duration-200 focus:border-primary dark:border-dark-3 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="w-full px-4">
                    <div className="mb-6">
                      <label
                        htmlFor="contactEmail"
                        className="text-dark mb-2.5 block text-base font-medium dark:text-white"
                      >
                        Email
                      </label>
                      <input
                        id="contactEmail"
                        type="email"
                        placeholder="yourname@company.com"
                        className="h-[50px] w-full rounded-lg border border-stroke bg-transparent px-5 py-3 text-dark placeholder-dark-5 outline-hidden duration-200 focus:border-primary dark:border-dark-3 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="w-full px-4">
                    <div className="mb-6">
                      <label
                        htmlFor="contactPhone"
                        className="text-dark mb-2.5 block text-base font-medium dark:text-white"
                      >
                        Phone number
                      </label>
                      <input
                        id="contactPhone"
                        type="text"
                        placeholder="+1 (250) 562-8273"
                        className="h-[50px] w-full rounded-lg border border-stroke bg-transparent px-5 py-3 text-dark placeholder-dark-5 outline-hidden duration-200 focus:border-primary dark:border-dark-3 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="w-full px-4">
                    <div className="mb-6">
                      <label
                        htmlFor="contactMessage"
                        className="text-dark mb-2.5 block text-base font-medium dark:text-white"
                      >
                        Message
                      </label>
                      <textarea
                        id="contactMessage"
                        rows="6"
                        placeholder="Tell us about the occasion, delivery date, or any ideas you have."
                        className="w-full rounded-lg border border-stroke bg-transparent p-5 text-dark placeholder-dark-5 outline-hidden duration-200 focus:border-primary dark:border-dark-3 dark:text-white"
                      ></textarea>
                    </div>
                  </div>
                  <div className="w-full px-4">
                    <button
                      type="submit"
                      className="flex h-[52px] w-full items-center justify-center rounded-lg bg-dark px-5 py-3 text-base font-medium text-white duration-200 hover:bg-dark/90 dark:bg-white dark:text-dark dark:hover:bg-white/90"
                    >
                      Send Message
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute top-0 left-0 -z-10 h-full w-full">
          <img
            src="public/greenBG.png"
            alt="Decorative flower accent"
            className="pointer-events-none select-none h-full w-full object-cover md:object-center object-right"
            style={{
              WebkitMaskImage:
                "linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0.6) 160px, rgba(0,0,0,1) 240px)",
              maskImage:
                "linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0.6) 160px, rgba(0,0,0,1) 240px)",
            }}
          />
        </div>
        <div className="absolute right-0 top-0 -z-10">
          <img
            src="https://cdn.tailgrids.com/assets/images/application/contacts/contact-13/shape-2.svg"
            alt="Decorative flower accent"
          />
        </div>
        <div className="absolute right-0 top-0 -z-10 max-lg:hidden dark:opacity-40">
          <img
            src="https://cdn.tailgrids.com/assets/images/application/contacts/contact-13/line-1.svg"
            alt="Decorative grid lines"
          />
        </div>
        <div className="absolute right-0 top-0 -z-10 max-lg:hidden dark:opacity-40">
          <img
            src="https://cdn.tailgrids.com/assets/images/application/contacts/contact-13/line-2.svg"
            alt="Decorative grid lines"
          />
        </div>
      </section>
    </>
  );
};

export default Contact;
