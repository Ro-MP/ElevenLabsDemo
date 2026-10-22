export interface TranscriptLine {
  role: 'user' | 'agent';
  message: string;
}

export interface CriterionResult {
  criteria_id: string;
  result: 'success' | 'failure' | 'unknown';
  rationale: string;
}

export interface DataCollectionResult {
  data_collection_id: string;
  value: unknown;
  rationale: string;
}

export interface ConversationAnalysis {
  call_successful: 'success' | 'failure' | 'unknown';
  transcript_summary: string;
  evaluation_criteria_results: Record<string, CriterionResult>;
  data_collection_results: Record<string, DataCollectionResult>;
}

export interface ConversationDetails {
  conversation_id: string;
  status: 'initiated' | 'in-progress' | 'processing' | 'done' | 'failed';
  transcript: { role: 'user' | 'agent'; message: string | null; time_in_call_secs: number }[];
  analysis: ConversationAnalysis | null;
}
