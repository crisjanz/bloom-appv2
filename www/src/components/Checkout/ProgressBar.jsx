import PropTypes from 'prop-types';

const ProgressBar = ({
  steps,
  currentStep,
  completedSteps,
  skippedSteps,
  onStepClick,
}) => {
  const current = steps.find((step) => step.id === currentStep);

  return (
    <div className="mb-8 rounded-2xl border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-dark-2">
      <div className="hidden items-center justify-between gap-3 sm:flex">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const isSkipped = skippedSteps.includes(step.id);
          const isClickable = isCompleted || step.id === currentStep;

          return (
            <div key={step.id} className="flex flex-1 items-center">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => onStepClick(step.id)}
                className={`flex items-center gap-2 text-left transition ${
                  isClickable ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold ${
                    isCurrent
                      ? 'border-primary bg-primary text-white'
                      : isCompleted
                        ? 'border-primary bg-primary/10 text-primary'
                        : isSkipped
                          ? 'border-stroke bg-transparent text-body-color/60 dark:border-dark-3 dark:text-dark-6/60'
                          : 'border-stroke bg-transparent text-body-color dark:border-dark-3 dark:text-dark-6'
                  }`}
                >
                  {index + 1}
                </span>
                <span
                  className={`text-sm font-medium ${
                    isCurrent || isCompleted
                      ? 'text-dark dark:text-white'
                      : 'text-body-color/70 dark:text-dark-6/70'
                  }`}
                >
                  {step.label}
                </span>
              </button>
              {index < steps.length - 1 && (
                <div
                  className={`mx-3 h-[2px] flex-1 ${
                    isCompleted ? 'bg-primary/50' : 'bg-stroke dark:bg-dark-3'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="sm:hidden">
        <div className="flex items-start">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = step.id === currentStep;
            const isSkipped = skippedSteps.includes(step.id);
            const isClickable = isCompleted || isCurrent;

            return (
              <div key={step.id} className="flex flex-1 items-center">
                <div className="flex flex-1 flex-col items-center">
                  <div className="flex w-full items-center">
                    {index > 0 && (
                      <div
                        className={`h-[2px] flex-1 ${
                          completedSteps.includes(steps[index - 1].id) ? 'bg-primary/50' : 'bg-stroke dark:bg-dark-3'
                        }`}
                      />
                    )}
                    <button
                      type="button"
                      disabled={!isClickable}
                      onClick={() => onStepClick(step.id)}
                      className={isClickable ? 'cursor-pointer' : 'cursor-default'}
                    >
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition ${
                          isCurrent
                            ? 'border-primary bg-primary text-white'
                            : isCompleted
                              ? 'border-primary bg-primary/10 text-primary'
                              : isSkipped
                                ? 'border-stroke/60 text-body-color/40 dark:border-dark-3/60'
                                : 'border-stroke text-body-color dark:border-dark-3 dark:text-dark-6'
                        }`}
                      >
                        {isCompleted ? (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </span>
                    </button>
                    {index < steps.length - 1 && (
                      <div
                        className={`h-[2px] flex-1 ${
                          isCompleted ? 'bg-primary/50' : 'bg-stroke dark:bg-dark-3'
                        }`}
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!isClickable}
                    onClick={() => onStepClick(step.id)}
                    className={`mt-1 ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span
                      className={`text-[10px] font-medium leading-tight ${
                        isCurrent
                          ? 'text-primary'
                          : isCompleted
                            ? 'text-dark dark:text-white'
                            : 'text-body-color/60 dark:text-dark-6/60'
                      }`}
                    >
                      {step.label}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

ProgressBar.propTypes = {
  steps: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      label: PropTypes.string.isRequired,
    }),
  ).isRequired,
  currentStep: PropTypes.number.isRequired,
  completedSteps: PropTypes.arrayOf(PropTypes.number).isRequired,
  skippedSteps: PropTypes.arrayOf(PropTypes.number).isRequired,
  onStepClick: PropTypes.func.isRequired,
};

export default ProgressBar;
