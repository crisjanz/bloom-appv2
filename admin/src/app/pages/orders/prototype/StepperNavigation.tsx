// StepperNavigation.tsx - Prototype stepper component
interface Step {
  id: number;
  name: string;
  key: string;
}

interface Props {
  steps: Step[];
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick: (stepId: number) => void;
  orderMethod: "DELIVERY" | "PICKUP";
}

export default function StepperNavigation({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  orderMethod,
}: Props) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        // Skip delivery step for pickup orders
        if (step.key === "delivery" && orderMethod === "PICKUP") {
          return null;
        }

        const isCompleted = completedSteps.has(step.id);
        const isCurrent = currentStep === step.id;
        const isClickable = isCompleted || completedSteps.has(step.id - 1) || isCurrent;

        return (
          <div key={step.id} className="flex items-center flex-1">
            {/* Compact Step Circle */}
            <button
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              title={step.name}
              className={`flex items-center justify-center w-7 h-7 rounded-full border-2 text-xs font-semibold transition-all ${
                isCurrent
                  ? "bg-[#597485] border-[#597485] text-white"
                  : isCompleted
                  ? "bg-green-500 border-green-500 text-white"
                  : "bg-white border-gray-300 text-gray-400 dark:bg-boxdark dark:border-strokedark"
              } ${isClickable ? "cursor-pointer hover:scale-105" : "cursor-not-allowed opacity-50"}`}
            >
              {isCompleted ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.id
              )}
            </button>

            {/* Compact Step Label */}
            <div className="ml-2 flex-1">
              <p
                className={`text-xs font-medium ${
                  isCurrent
                    ? "text-[#597485] dark:text-[#7a9bb0]"
                    : isCompleted
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {step.name}
              </p>
            </div>

            {/* Connecting Line */}
            {index < steps.length - 1 && !(step.key === "recipient" && orderMethod === "PICKUP") && (
              <div
                className={`flex-1 h-0.5 mx-2 ${
                  isCompleted ? "bg-green-500" : "bg-gray-300 dark:bg-strokedark"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
