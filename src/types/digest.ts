export type DigestItem = {
  id: string;
  title: string;
  url: string;
  sourceId: string;
  sourceType: string;
  sourceLabel?: string;
  tags: string[];
  author?: string;
  description?: string;
  publishedAt?: string;
  stars?: number;
  language?: string;
};

export type DigestPayload = {
  date: string;
  generatedAt: string;
  configVersion: number;
  items: DigestItem[];
  notes: string[];
};
