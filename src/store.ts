import { create } from 'zustand';
import type { Feature, Point, LineString, GeoJsonProperties } from 'geojson';

export interface POIProperties {
	id: string;
	name: string;
	category: string;
	budget_tier: string;
	typical_duration_minutes: number;
	opening_hours: { open: string; close: string };
}

export type BlockType = 'fixed' | 'poi' | 'travel';

export interface TimeBlock {
	id: string;
	type: BlockType;
	title: string;
	startTime: string; // HH:mm
	endTime: string; // HH:mm
	durationMinutes: number;
	poi?: Feature<Point, POIProperties>;
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

export interface QnAHistoryItem {
	question: string;
	answer: string;
}

interface AppState {
	step: number;

	// Phase 1: Intent
	intent: Intent;

	// Phase 2: Questionnaire
	questions: QuestionnaireItem[];
	answers: Record<string, string>;
	qnaHistory: QnAHistoryItem[]; // NEW

	// Phase 4: Itinerary Result
	blocks: TimeBlock[];
	routeGeoJSON: Feature<LineString, GeoJsonProperties> | null;

	// Loading status
	loadingStatus: string;

	// Actions
	setIntent: (intent: Intent) => void;
	setQuestions: (questions: QuestionnaireItem[]) => void;
	setAnswer: (questionId: string, answer: string) => void;
	addQnA: (items: QnAHistoryItem[]) => void; // NEW
	clearAnswers: () => void; // NEW
	setBlocks: (blocks: TimeBlock[]) => void;
	setRouteGeoJSON: (
		route: Feature<LineString, GeoJsonProperties> | null,
	) => void;
	setStep: (step: number) => void;
	setLoadingStatus: (status: string) => void;
}

export const useStore = create<AppState>((set) => ({
	step: 1,

	intent: {
		origin: '',
		destination: '',
		dates: '',
		budget: '',
	},

	questions: [],
	answers: {},
	qnaHistory: [],

	blocks: [],
	routeGeoJSON: null,

	loadingStatus: '',

	setIntent: (intent) => set({ intent }),
	setQuestions: (questions) => set({ questions }),
	setAnswer: (questionId, answer) =>
		set((state) => ({
			answers: { ...state.answers, [questionId]: answer },
		})),
	addQnA: (items) =>
		set((state) => ({
			qnaHistory: [...state.qnaHistory, ...items],
		})),
	clearAnswers: () => set({ answers: {} }),
	setBlocks: (blocks) => set({ blocks }),
	setRouteGeoJSON: (routeGeoJSON) => set({ routeGeoJSON }),
	setStep: (step) => set({ step }),
	setLoadingStatus: (status) => set({ loadingStatus: status }),
}));
