export interface DiagnosticEntry {
  id: string;
  timestamp: number; 
  level: 'warn' | 'error' | 'fatal';
  context: string; // e.g., "GeneratorService", "StorageAdapter"
  message: string;
  detail?: string; // Stack trace or serialized error
}
