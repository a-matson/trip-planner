import React, { useState } from 'react';
import { useStore } from '../store';
import { MapPin, Calendar, DollarSign, Navigation } from 'lucide-react';
import { useCityIndex } from '../hooks/citySearch';

type Field = 'origin' | 'destination';

export const Phase1: React.FC = () => {
	const { setIntent, setStep } = useStore();
	const { search, ready, progress } = useCityIndex();
	const [results, setResults] = useState<string[]>([]);
	const [open, setOpen] = useState<Field>();
	const [form, setForm] = useState({
		origin: '',
		destination: '',
		dates: '',
		budget: 'medium',
	});

	const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();
		setIntent(form);
		setStep(2);
	};

	const handleSearch = async (
		e: React.ChangeEvent<HTMLInputElement>,
		type: Field,
	) => {
		const value = e.target.value;
		setForm({ ...form, [type]: value });

		if (!value) {
			setResults([]);
			setOpen(undefined);
			return;
		}

		const res = (await search(value, 10)) || [];
		setResults(res);
		setOpen(type);
	};

	const selectItem = (item: string, type: Field) => {
		setForm({ ...form, [type]: item });
		setOpen(undefined);
		setResults([]);
	};

	if (!ready) {
		return <div>Loading city database: {progress}%</div>;
	}

	return (
		<div className="glass-panel animate-fade-in form-container">
			<h2 className="form-title">Plan Your Next Adventure</h2>

			<form onSubmit={handleSubmit}>
				<div className="form-group">
					<label className="form-label">
						<Navigation size={16} /> Where From?
					</label>
					<input
						type="text"
						required
						className="input-field"
						placeholder="e.g. New York, NY"
						value={form.origin}
						onChange={(e) => handleSearch(e, 'origin')}
						onFocus={() => results.length && setOpen('origin')}
						onBlur={() => setTimeout(() => setOpen(undefined), 150)}
					/>
					{open === 'origin' && results.length > 0 && (
						<ul
							style={{
								position: 'absolute',
								top: '100%',
								left: 0,
								right: 0,
								background: 'black',
								border: '1px solid #ddd',
								borderTop: 'none',
								maxHeight: 200,
								overflowY: 'auto',
								zIndex: 1000,
							}}
						>
							{results.map((item, idx) => (
								<li
									key={idx}
									onMouseDown={() => selectItem(item, 'origin')}
									style={{
										padding: '8px 10px',
										cursor: 'pointer',
									}}
								>
									{item}
								</li>
							))}
						</ul>
					)}
				</div>

				<div className="form-group">
					<label className="form-label">
						<MapPin size={16} /> Where To?
					</label>
					<input
						type="text"
						required
						className="input-field"
						placeholder="e.g. San Francisco, CA"
						value={form.destination}
						onChange={(e) => handleSearch(e, 'destination')}
						onFocus={() => results.length && setOpen('destination')}
						onBlur={() => setTimeout(() => setOpen(undefined), 150)}
					/>
					{open === 'destination' && results.length > 0 && (
						<ul
							style={{
								position: 'absolute',
								top: '100%',
								left: 0,
								right: 0,
								background: 'black',
								border: '1px solid #ddd',
								borderTop: 'none',
								maxHeight: 200,
								overflowY: 'auto',
								zIndex: 1000,
							}}
						>
							{results.map((item, idx) => (
								<li
									key={idx}
									onMouseDown={() => selectItem(item, 'destination')}
									style={{
										padding: '8px 10px',
										cursor: 'pointer',
									}}
								>
									{item}
								</li>
							))}
						</ul>
					)}
				</div>

				<div className="form-group">
					<label className="form-label">
						<Calendar size={16} /> Dates
					</label>
					<input
						type="text"
						required
						className="input-field"
						placeholder="e.g. Tomorrow"
						value={form.dates}
						onChange={(e) => setForm({ ...form, dates: e.target.value })}
					/>
				</div>

				<div className="form-group">
					<label className="form-label">
						<DollarSign size={16} /> Budget Tier
					</label>
					<select
						className="input-field"
						value={form.budget}
						onChange={(e) => setForm({ ...form, budget: e.target.value })}
					>
						<option value="">Any</option>
						<option value="free">Free</option>
						<option value="low">Low ($)</option>
						<option value="medium">Medium ($$)</option>
						<option value="high">High ($$$)</option>
					</select>
				</div>

				<button type="submit" className="btn w-full mt-6">
					Continue
				</button>
			</form>
		</div>
	);
};
