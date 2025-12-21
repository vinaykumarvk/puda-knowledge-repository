export type PageType =
  | "dashboard"
  | "portfolio"
  | "order_entry"
  | "reporting"
  | "client_profile"
  | "general";

export type RouteContext = {
  path: string;
  pageType: PageType;
  pageName: string;
  viewportWidth: number;
  viewportHeight: number;
};

export type GateIssue = {
  gateId: string;
  checkId: string;
  severity: "high" | "medium" | "low";
  message: string;
  details?: Record<string, unknown>;
};

const routePageTypes: Array<{
  pattern: RegExp;
  pageType: PageType;
  pageName: string;
}> = [
  { pattern: /^\/$/, pageType: "dashboard", pageName: "chatbot" },
  { pattern: /^\/workshop$/, pageType: "dashboard", pageName: "launchpad" },
  { pattern: /^\/quiz$/, pageType: "general", pageName: "quiz" },
  { pattern: /^\/atlas$/, pageType: "reporting", pageName: "atlas" },
  { pattern: /^\/rfp$/, pageType: "reporting", pageName: "rfp" },
  { pattern: /^\/investment-portal$/, pageType: "portfolio", pageName: "investment-portal" },
  { pattern: /^\/investment-portal\/new$/, pageType: "order_entry", pageName: "investment-new" },
  { pattern: /^\/investment-portal\/investments$/, pageType: "portfolio", pageName: "investments" },
  { pattern: /^\/investment-portal\/tasks$/, pageType: "general", pageName: "tasks" },
  { pattern: /^\/investment-portal\/templates$/, pageType: "reporting", pageName: "templates" },
  { pattern: /^\/login$/, pageType: "general", pageName: "login" },
];

export const performanceBlockingPageTypes = new Set<PageType>([
  "dashboard",
  "portfolio",
  "order_entry",
  "reporting",
  "client_profile",
]);

export function getRouteContext(path: string): RouteContext {
  const match = routePageTypes.find((route) => route.pattern.test(path));
  const pageType = match?.pageType ?? "general";
  const pageName = match?.pageName ?? "unknown";

  return {
    path,
    pageType,
    pageName,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  };
}

export function runUxGateAudit(
  context: RouteContext & { clsValue?: number | null },
): GateIssue[] {
  const issues: GateIssue[] = [];

  const docElement = document.documentElement;
  if (docElement && docElement.scrollWidth > docElement.clientWidth + 1) {
    issues.push({
      gateId: "mobile_responsive",
      checkId: "small_screen_support",
      severity: "high",
      message: "Horizontal scroll detected on current viewport.",
      details: {
        scrollWidth: docElement.scrollWidth,
        clientWidth: docElement.clientWidth,
      },
    });
  }

  if (!document.querySelector("main, [role='main']")) {
    issues.push({
      gateId: "accessibility_wcag",
      checkId: "screen_reader_support",
      severity: "high",
      message: "Main landmark is missing.",
    });
  }

  issues.push(...auditAccessibleNames());

  if (context.viewportWidth <= 480) {
    issues.push(...auditTouchTargets());
  }

  if (typeof context.clsValue === "number" && context.clsValue > 0.1) {
    issues.push({
      gateId: "performance_perceived",
      checkId: "layout_stability",
      severity: "medium",
      message: "Layout shifts detected after navigation.",
      details: { clsValue: context.clsValue },
    });
  }

  return issues;
}

export function logUxGateIssues(
  issues: GateIssue[],
  context: RouteContext,
): void {
  if (issues.length === 0) {
    return;
  }

  const blockingPerformance =
    performanceBlockingPageTypes.has(context.pageType);

  console.debug("[UX-Gate]", {
    path: context.path,
    pageType: context.pageType,
    pageName: context.pageName,
    performanceBlocking: blockingPerformance,
    issues,
  });
}

function auditAccessibleNames(): GateIssue[] {
  const issues: GateIssue[] = [];
  const elements = Array.from(
    document.querySelectorAll(
      "button, [role='button'], a[href], [role='link'], input, select, textarea",
    ),
  ).slice(0, 200);

  const missingLabels: Array<{ tag: string; testId?: string | null }> = [];

  elements.forEach((element) => {
    if (!(element instanceof HTMLElement)) {
      return;
    }
    if (!isVisible(element) || element.getAttribute("aria-hidden") === "true") {
      return;
    }

    const name = getAccessibleName(element);
    if (!name) {
      missingLabels.push({
        tag: element.tagName.toLowerCase(),
        testId: element.getAttribute("data-testid"),
      });
    }
  });

  if (missingLabels.length > 0) {
    issues.push({
      gateId: "accessibility_wcag",
      checkId: "screen_reader_support",
      severity: "high",
      message: "Interactive elements missing accessible names.",
      details: { count: missingLabels.length, sample: missingLabels.slice(0, 5) },
    });
  }

  return issues;
}

function auditTouchTargets(): GateIssue[] {
  const issues: GateIssue[] = [];
  const elements = Array.from(
    document.querySelectorAll(
      "button, [role='button'], a[href], [role='link'], input, select, textarea",
    ),
  ).slice(0, 200);

  const undersized: Array<{ tag: string; width: number; height: number }> = [];

  elements.forEach((element) => {
    if (!(element instanceof HTMLElement)) {
      return;
    }
    if (!isVisible(element)) {
      return;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width < 44 || rect.height < 44) {
      undersized.push({
        tag: element.tagName.toLowerCase(),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    }
  });

  if (undersized.length > 0) {
    issues.push({
      gateId: "accessibility_wcag",
      checkId: "touch_targets",
      severity: "medium",
      message: "Touch targets below minimum size on mobile viewport.",
      details: { count: undersized.length, sample: undersized.slice(0, 5) },
    });
  }

  return issues;
}

function getAccessibleName(element: HTMLElement): string {
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) {
    return ariaLabel.trim();
  }

  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    const labelText = labelledBy
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ")
      .trim();
    if (labelText) {
      return labelText;
    }
  }

  const title = element.getAttribute("title");
  if (title) {
    return title.trim();
  }

  if (element instanceof HTMLInputElement) {
    if (element.value) {
      return element.value.trim();
    }
    if (element.placeholder) {
      return element.placeholder.trim();
    }
  }

  return element.textContent?.trim() ?? "";
}

function isVisible(element: HTMLElement): boolean {
  if (element.hasAttribute("hidden")) {
    return false;
  }
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") {
    return false;
  }
  return element.getClientRects().length > 0;
}
