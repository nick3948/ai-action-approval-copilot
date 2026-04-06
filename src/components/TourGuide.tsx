"use client";

import { useEffect, useState } from "react";
import { Joyride, STATUS, TooltipRenderProps } from "react-joyride";

const CustomTooltip = ({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  tooltipProps,
  isLastStep,
}: TooltipRenderProps) => {
  return (
    <div
      {...tooltipProps}
      className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl max-w-sm"
    >
      {step.title && (
        <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
      )}
      <div className="text-gray-300 text-sm mb-6 leading-relaxed">
        {step.content}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 font-medium">
          Step {index + 1}
        </div>
        <div className="flex gap-2 items-center">
          {index > 0 && (
            <button
              {...backProps}
              className="px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Back
            </button>
          )}
          <button
            {...primaryProps}
            className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-lg shadow-indigo-600/30"
          >
            {isLastStep ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
};

export function TourGuide() {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [steps, setSteps] = useState<any[]>([
    {
      target: ".tour-step-welcome",
      content: "Welcome to the AI Action Approval Copilot! This isn't just a chatbot—it's a high-security agent that can run commands on GitHub and Slack for you.",
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: ".tour-step-integrations",
      content: "Before the AI can do anything, you need to link your developer accounts here. We use secure, just-in-time Auth0 tokens.",
      placement: "right",
    },
    {
      target: ".tour-step-manual",
      content: "This is the System Manual. It breaks down the 4-Tier security model so you know exactly which actions require human approval.",
      placement: "bottom",
    },
    {
      target: ".tour-step-input",
      content: "Everything starts here. You can type commands like 'create a repository with name <repo_name> and description <repo_description>', click the mic to use Voice Input, and watch the AI execute safely!",
      placement: "top",
    }
  ]);

  useEffect(() => {
    // Check if the user has completed the tour previously
    const hasSeenTour = localStorage.getItem("has_seen_copilot_tour");
    if (!hasSeenTour) {
      setTimeout(() => setRun(true), 500);
    }
  }, []);


  const handleJoyrideCallback = (data: any) => {
    const { action, index, status, type } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (action === "close" && type === "step:after") {
      setSteps(prev => prev.map((s, i) => i === index ? { ...s, disableBeacon: false } : s));
      setStepIndex(index);
      setRun(false);
      setTimeout(() => setRun(true), 10);
      return;
    }

    if (finishedStatuses.includes(status)) {
      setRun(false);
      localStorage.setItem("has_seen_copilot_tour", "true");
    } else if (type === "step:after" && action === "next") {
      setStepIndex(index + 1);
    } else if (type === "step:after" && action === "prev") {
      setStepIndex(index - 1);
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      scrollToFirstStep
      onEvent={handleJoyrideCallback}
      tooltipComponent={CustomTooltip}
      options={{
        primaryColor: "#4f46e5",
        zIndex: 10000,
        arrowColor: "#111827",
      }}
    />
  );
}
