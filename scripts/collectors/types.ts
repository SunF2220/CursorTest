import type { SourceDefinition } from "../../src/lib/digest-config";
import type { DigestItem } from "../../src/types/digest";

export type CollectorContext = {
  source: SourceDefinition;
  notes: string[];
};

export type CollectorResult = {
  items: DigestItem[];
};

export type Collector = (ctx: CollectorContext) => Promise<CollectorResult>;
