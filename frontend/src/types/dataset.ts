import type { AnalysisResult } from "./analysis";

export interface Dataset {
  id: number;
  name: string;
  original_file: string;
  uploaded_at: string;
  analysis?: AnalysisResult | null;
}
