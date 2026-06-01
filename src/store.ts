import { create } from 'zustand';
import type { Feature, Point, LineString } from 'geojson';

export type BlockType = 'fixed' | 'poi' | 'travel';

export interface TimeBlock {
  id: string;
  type: BlockType;
  title: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  durationMinutes: number;
  poi?: Feature<Point, Record<string, unknown>>;
}

export interface Intent {
  origin: string;
  destination: string;
  dates: string;
  budget: string;
}

export interface QuestionnaireItem {
  id: string;
  question: string;
  options: string[];
}

interface AppState {
  step: number; // 1: Intent, 2: Questionnaire, 3: Loading/Assembly, 4: Map & Timeline
  
  // Phase 1: Intent
  intent: Intent;
  
  // Phase 2: Questionnaire
  questions: QuestionnaireItem[];
  answers: Record<string, string>;
  
  // Phase 4: Itinerary Result
  blocks: TimeBlock[];
  routeGeoJSON: Feature<LineString, Record<string, unknown>> | null;
  
  // Loading status
  loadingStatus: string;
  
  // Actions
  setIntent: (intent: Intent) => void;
  setQuestions: (questions: QuestionnaireItem[]) => void;
  setAnswer: (questionId: string, answer: string) => void;
  setBlocks: (blocks: TimeBlock[]) => void;
  setRouteGeoJSON: (route: Feature<LineString, Record<string, unknown>> | null) => void;
  setStep: (step: number) => void;
  setLoadingStatus: (status: string) => void;
}

export const useStore = create<AppState>((set) => ({
  step: 1,
  
  intent: {
    origin: '',
    destination: '',
    dates: '',
    budget: ''
  },
  
  questions: [],
  answers: {},
  
  blocks: [],
  routeGeoJSON: null,
  
  loadingStatus: '',
  
  setIntent: (intent) => set({ intent }),
  setQuestions: (questions) => set({ questions }),
  setAnswer: (questionId, answer) => set((state) => ({ 
    answers: { ...state.answers, [questionId]: answer } 
  })),
  setBlocks: (blocks) => set({ blocks }),
  setRouteGeoJSON: (routeGeoJSON) => set({ routeGeoJSON }),
  setStep: (step) => set({ step }),
  setLoadingStatus: (status) => set({ loadingStatus: status })
}));
