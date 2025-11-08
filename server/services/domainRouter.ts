import {
  DEFAULT_DOMAIN_ID,
  DomainConfig,
  DomainId,
  domainExists,
  listDomains,
} from "./domainRegistry";

export type DomainResolutionStrategy =
  | "explicit"
  | "conversation"
  | "metadata"
  | "classifier"
  | "fallback";

export interface DomainResolutionResult {
  domainId: DomainId;
  strategy: DomainResolutionStrategy;
  confidence: number;
  matchedKeywords: string[];
}

interface DomainResolutionInput {
  question: string;
  explicitDomain?: string;
  conversationDomain?: string;
  metadataDomain?: string;
}

/**
 * DomainRouter picks the best-fitting domain for a question so we can send the
 * correct vector-store-backed domain to the EKG API. It prefers explicit or
 * previously established domains and only falls back to heuristics when needed.
 */
export class DomainRouter {
  resolve(input: DomainResolutionInput): DomainResolutionResult {
    const normalizedQuestion = input.question?.toLowerCase().trim() ?? "";

    if (domainExists(input.explicitDomain)) {
      return {
        domainId: input.explicitDomain as DomainId,
        strategy: "explicit",
        confidence: 1,
        matchedKeywords: [],
      };
    }

    if (domainExists(input.conversationDomain)) {
      return {
        domainId: input.conversationDomain as DomainId,
        strategy: "conversation",
        confidence: 1,
        matchedKeywords: [],
      };
    }

    if (domainExists(input.metadataDomain)) {
      return {
        domainId: input.metadataDomain as DomainId,
        strategy: "metadata",
        confidence: 0.9,
        matchedKeywords: [],
      };
    }

    if (normalizedQuestion.length) {
      const classified = this.classify(normalizedQuestion);
      if (classified) {
        return classified;
      }
    }

    return {
      domainId: DEFAULT_DOMAIN_ID,
      strategy: "fallback",
      confidence: 0,
      matchedKeywords: [],
    };
  }

  private classify(question: string): DomainResolutionResult | null {
    const domains = listDomains();
    if (!domains.length) {
      return null;
    }
    const scores = domains.map((domain) => {
      const { matches, matchedKeywords } = this.scoreDomain(question, domain);
      return {
        domain,
        matches,
        matchedKeywords,
        confidence: matches / Math.max(domain.keywords.length, 1),
      };
    });

    const best = scores.reduce((prev, curr) => {
      if (!prev) return curr;
      return curr.matches > prev.matches ? curr : prev;
    }, scores[0]);

    if (!best || best.matches === 0) {
      return null;
    }

    return {
      domainId: best.domain.id,
      strategy: "classifier",
      confidence: Number(best.confidence.toFixed(2)),
      matchedKeywords: best.matchedKeywords,
    };
  }

  private scoreDomain(question: string, domain: DomainConfig) {
    const matchedKeywords: string[] = [];

    for (const keyword of domain.keywords) {
      const normalizedKeyword = keyword.toLowerCase();
      if (!normalizedKeyword) continue;
      if (question.includes(normalizedKeyword)) {
        matchedKeywords.push(keyword);
      }
    }

    return {
      matches: matchedKeywords.length,
      matchedKeywords,
    };
  }
}
