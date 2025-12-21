import { useEffect } from "react";
import { useLocation } from "wouter";
import { getRouteContext, logUxGateIssues, runUxGateAudit } from "@/lib/ux-gates";

const CLS_CAPTURE_MS = 1500;

export function UxGateAuditor() {
  const [location] = useLocation();

  useEffect(() => {
    let clsValue = 0;
    let observer: PerformanceObserver | null = null;

    if ("PerformanceObserver" in window) {
      try {
        observer = new PerformanceObserver((entryList) => {
          entryList.getEntries().forEach((entry) => {
            const layoutShift = entry as PerformanceEntry & {
              value?: number;
              hadRecentInput?: boolean;
            };
            if (!layoutShift.hadRecentInput && layoutShift.value) {
              clsValue += layoutShift.value;
            }
          });
        });
        observer.observe({ type: "layout-shift", buffered: true });
      } catch {
        observer = null;
      }
    }

    const timer = window.setTimeout(() => {
      const context = getRouteContext(location);
      const issues = runUxGateAudit({ ...context, clsValue });
      logUxGateIssues(issues, context);
      observer?.disconnect();
    }, CLS_CAPTURE_MS);

    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
    };
  }, [location]);

  return null;
}
