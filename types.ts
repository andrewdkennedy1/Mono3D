
export interface MeshSettings {
  heightScale: number;
  baseThickness: number;
  resolution: number;
  invert: boolean;
  smoothing: number;
  removeBackground: boolean;
  maskThreshold: number;
  flatTop: boolean;
  contrast: number;
  simplification: number; // New: Douglas-Peucker tolerance for clean paths
  enableBase: boolean;
}

export interface AnalysisResult {
  summary: string;
  suggestedSettings: Partial<MeshSettings>;
  useCase: string;
}
