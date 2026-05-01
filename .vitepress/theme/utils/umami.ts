type UmamiValue = string | number | boolean | null;

type UmamiEventData = Record<string, UmamiValue>;

type UmamiTracker = {
  track: (eventName: string, data?: UmamiEventData) => void;
};

declare global {
  interface Window {
    umami?: UmamiTracker;
  }
}

export function trackUmamiEvent(eventName: string, data?: UmamiEventData): void {
  if (typeof window === "undefined") return;

  const tracker = window.umami;
  if (!tracker?.track) return;

  if (data && Object.keys(data).length > 0) {
    tracker.track(eventName, data);
    return;
  }

  tracker.track(eventName);
}
