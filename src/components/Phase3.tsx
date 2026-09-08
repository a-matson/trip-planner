import React, { useEffect } from 'react';
import { useStore } from '../store';
import { generateItinerary, fetchPOIs } from '../tripEngine';
import { initAI } from '../ai';
import { Loader2 } from 'lucide-react';

export const Phase3: React.FC = () => {
	const { intent, answers, setBlocks, setRouteGeoJSON, setStep } = useStore();

	const initRef = React.useRef(false);

	useEffect(() => {
		if (initRef.current) return;
		initRef.current = true;

		const build = async () => {
			try {
				const engine = await initAI(() => {});
				const pois = await fetchPOIs();
				const { blocks, routeGeoJSON } = await generateItinerary(
					engine,
					intent,
					answers,
					pois,
				);
				setBlocks(blocks);
				setRouteGeoJSON(routeGeoJSON);
				setStep(4);
			} catch (e) {
				console.error(e);
			}
		};
		build();
	}, [intent, answers, setBlocks, setRouteGeoJSON, setStep]);

	return (
		<div className="loading-container animate-fade-in">
			<Loader2 className="spinner secondary" />
			<h2 className="form-title" style={{ marginBottom: '0.5rem' }}>
				Assembling Your Itinerary...
			</h2>
			<p style={{ color: '#9ca3af' }}>
				Calculating optimal paths entirely on your device
			</p>
		</div>
	);
};
