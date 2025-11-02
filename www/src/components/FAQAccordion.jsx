import { useState } from "react";

const FAQAccordion = ({
  items = [],
  eyebrow = "FAQ",
  title = "Frequently Asked Questions",
  description,
  isLoading = false,
  error = null,
}) => {
  const showEmptyState = !isLoading && !error && items.length === 0;

  return (
    <section className="bg-white pb-10 pt-20 dark:bg-dark lg:pb-20 lg:pt-[120px]">
      <div className="container mx-auto">
        <div className="-mx-4 flex flex-wrap">
          <div className="w-full px-4">
            <div className="mx-auto mb-[60px] max-w-[620px] text-center lg:mb-20">
              {eyebrow ? (
                <span className="mb-2 block text-lg font-semibold text-primary">
                  {eyebrow}
                </span>
              ) : null}
              <h2 className="text-3xl font-bold text-dark dark:text-white sm:text-[40px]/[48px]">
                {title}
              </h2>
              {description ? (
                <p className="mt-4 text-base text-body-color dark:text-dark-6">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="-mx-4 flex flex-wrap justify-center">
          <div className="w-full px-4 xl:w-10/12">
            {isLoading ? (
              <StatusMessage message="Loading FAQs..." />
            ) : error ? (
              <StatusMessage message={error} />
            ) : showEmptyState ? (
              <StatusMessage message="FAQ content is coming soon. Check back shortly." />
            ) : (
              items.map((item) => (
                <AccordionItem
                  key={item.id || item.question}
                  header={item.question}
                  text={item.answer}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

const AccordionItem = ({ header, text }) => {
  const [active, setActive] = useState(false);

  const handleToggle = (event) => {
    event.preventDefault();
    setActive((previous) => !previous);
  };

  return (
    <div className="mb-6 rounded-lg bg-white px-7 py-6 shadow-[0px_4px_18px_0px_rgba(0,0,0,0.07)] transition-all duration-200 dark:bg-dark-2 md:mb-10 md:px-10 md:py-8">
      <button
        type="button"
        className="faq-btn flex w-full items-center justify-between text-left"
        onClick={handleToggle}
        aria-expanded={active}
      >
        <h4 className="mr-2 text-base font-semibold text-dark dark:text-white sm:text-lg md:text-xl lg:text-2xl">
          {header}
        </h4>
        <span className="icon inline-flex h-8 w-full max-w-[32px] items-center justify-center rounded-full border-2 border-primary text-lg font-semibold text-primary">
          {active ? "-" : "+"}
        </span>
      </button>

      <div className={active ? "block" : "hidden"}>
        <p className="text-relaxed pt-6 text-base text-body-color dark:text-dark-6">
          {text}
        </p>
      </div>
    </div>
  );
};

const StatusMessage = ({ message }) => (
  <div className="rounded-lg border border-dashed border-primary/40 bg-white/40 px-6 py-12 text-center text-base font-medium text-body-color dark:border-dark-4 dark:bg-dark-2/40 dark:text-dark-6">
    {message}
  </div>
);

export default FAQAccordion;
