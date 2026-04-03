export type DigestItem = {
  id: string;
  title: string;
  url: string;
  source: "github" | "x";
  author?: string;
  description?: string;
  publishedAt?: string;
  stars?: number;
  language?: string;
};

export type DigestPayload = {
  date: string;
  generatedAt: string;
  github: DigestItem[];
  x: DigestItem[];
  notes: string[];
};
