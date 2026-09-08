import { useCallback, useEffect, useRef, useState } from 'react';

type Status =
	| 'idle'
	| 'loading-index'
	| 'loading-data'
	| 'building-index'
	| 'persisting'
	| 'ready'
	| 'error';

type SearchRequest = {
	resolve: (results: string[]) => void;
	reject: (error: Error) => void;
};

export function useCityIndex() {
	const workerRef = useRef<Worker | null>(null);
	const requestIdRef = useRef(0);
	const requestsRef = useRef(new Map<number, SearchRequest>());

	const [status, setStatus] = useState<Status>('idle');
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		const worker = new Worker(
			new URL('../workers/cityIndex.worker.ts', import.meta.url),
			{ type: 'module' },
		);

		workerRef.current = worker;

		worker.onmessage = (event) => {
			const message = event.data;

			switch (message.type) {
				case 'status':
					setStatus(message.status);

					if (message.progress !== undefined) setProgress(message.progress);

					break;

				case 'search-results': {
					const request = requestsRef.current.get(message.id);

					if (!request) return;

					request.resolve(message.results);
					requestsRef.current.delete(message.id);

					break;
				}

				case 'error':
					console.error('City index worker error:', message.error);
					setStatus('error');
					break;
			}
		};

		worker.postMessage({ type: 'init' });

		return () => {
			worker.terminate();
			workerRef.current = null;

			requestsRef.current.forEach(({ reject }) => {
				reject(new Error('City index worker terminated'));
			});

			requestsRef.current.clear();
		};
	}, []);

	const search = useCallback((query: string, limit = 10): Promise<string[]> => {
		return new Promise((resolve, reject) => {
			const worker = workerRef.current;

			if (!worker) {
				reject(new Error('City index worker not ready'));
				return;
			}

			const id = ++requestIdRef.current;

			requestsRef.current.set(id, { resolve, reject });

			worker.postMessage({ type: 'search', id, query, limit });
		});
	}, []);

	return {
		search,
		ready: status === 'ready',
		status,
		progress,
	};
}
