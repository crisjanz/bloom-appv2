import { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { smoothScrollTo } from "./utils";

export const MobileAccordionSection = ({ step, title, open, onToggle, children }) => {
  const wasOpenRef = useRef(open);

  // Scroll when this section opens (useEffect runs AFTER DOM commit)
  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;

    // Only scroll when transitioning from closed to open
    if (open && !wasOpen) {
      // Small delay to ensure all DOM updates are complete
      setTimeout(() => {
        const section = document.querySelector(`[data-step="${step}"]`);
        smoothScrollTo(section, 800);
      }, 50);
    }
  }, [open, step]);

  return (
    <div data-step={step} className="border-b border-stroke/40 pb-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-base font-semibold text-dark dark:text-white">
          {step}. {title}
        </span>
        <svg
          width="16"
          height="8"
          viewBox="0 0 16 8"
          className={`text-body-color transition-transform dark:text-dark-6 ${open ? "rotate-180" : ""}`}
        >
          <path
            fill="currentColor"
            d="M0.25 1.422 6.795 7.577C7.116 7.866 7.504 7.995 7.886 7.995c.403 0 .786-.167 1.091-.441L15.534 1.423c.293-.294.375-.811.023-1.162-.292-.292-.806-.375-1.157-.029L7.886 6.351 1.362.217C1.042-.058.542-.059.222.261c-.274.32-.275.82.046 1.141Z"
          />
        </svg>
      </button>
      {open && <div className="pt-3">{children}</div>}
    </div>
  );
};

MobileAccordionSection.propTypes = {
  step: PropTypes.number.isRequired,
  title: PropTypes.string.isRequired,
  open: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

export const FormStep = ({ step, title, open, onToggle, children }) => {
  const wasOpenRef = useRef(open);

  // Scroll when this section opens
  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;

    if (open && !wasOpen) {
      setTimeout(() => {
        const section = document.querySelector(`[data-step="${step}"]`);
        smoothScrollTo(section, 800);
      }, 50);
    }
  }, [open, step]);

  return (
    <div
      className="mb-6 overflow-hidden rounded-md border border-stroke dark:border-dark-3"
      data-step={step}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 xl:px-8"
      >
      <span className="text-lg font-semibold text-dark dark:text-white">
        {title}
      </span>
      <span
        className={`text-body-color transition-transform dark:text-dark-6 ${open ? "rotate-180" : ""}`}
      >
        <svg
          width="16"
          height="8"
          viewBox="0 0 16 8"
          className="fill-current"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M0.249946 1.42237L6.79504 7.57672L6.80132 7.58248C7.12214 7.87122 7.51003 8 7.89233 8C8.29531 8 8.67847 7.83258 8.9834 7.55814L15.5344 1.42264L15.539 1.41812C15.8326 1.12446 15.9148 0.607154 15.5634 0.255739C15.2711 -0.0365603 14.7572 -0.119319 14.4059 0.226496L7.89233 6.35117L1.36851 0.216817L1.36168 0.21097C1.04167 -0.0633254 0.541712 -0.0646794 0.221294 0.255739L0.21069 0.266343L0.20093 0.27773C-0.0733652 0.59774 -0.0747181 1.0977 0.2457 1.41812L0.249946 1.42237ZM15.3914 0.916253C15.3713 0.998351 15.3276 1.07705 15.2629 1.14175L8.72219 7.26758C8.47813 7.48723 8.18526 7.60926 7.89239 7.60926C7.59952 7.60926 7.30666 7.51164 7.0626 7.29199L0.521876 1.14175C0.406459 1.02633 0.369015 0.86636 0.402021 0.722033C0.368915 0.866425 0.406335 1.02652 0.521818 1.142L7.06254 7.29224C7.3066 7.51189 7.59947 7.60951 7.89233 7.60951C8.1852 7.60951 8.47807 7.48748 8.72213 7.26783L15.2628 1.142C15.3276 1.07723 15.3713 0.99844 15.3914 0.916253Z"
          ></path>
        </svg>
      </span>
    </button>
    <div
      className={`${open ? "block" : "hidden"} border-t border-stroke px-4 pb-8 pt-6 dark:border-dark-3 lg:px-5 xl:px-8`}
    >
      <div className="-mx-3 flex flex-wrap">{children}</div>
    </div>
  </div>
  );
};

FormStep.propTypes = {
  step: PropTypes.number.isRequired,
  title: PropTypes.string.isRequired,
  open: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};
