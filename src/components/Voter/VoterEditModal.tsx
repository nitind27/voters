"use client";

import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { voterdayatype } from './Votertype';

// Simple client-side translator using Google Translate public endpoint
// Simple client-side translator using Google Translate public endpoint
const translateText = async (text: string): Promise<string> => {
	if (!text?.trim()) return '';
	try {
		const res = await fetch(
			`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=mr&dt=t&q=${encodeURIComponent(text)}`
		);
		const data = (await res.json()) as unknown;

		// Expected shape: data[0] is an array of chunks: [ [ translatedText, ... ], ... ]
		if (Array.isArray(data) && Array.isArray((data as unknown[])[0])) {
			const chunks = (data as unknown[])[0] as unknown[];
			const parts = chunks
				.map((chunk) => (Array.isArray(chunk) && typeof chunk[0] === 'string' ? chunk[0] : ''))
				.filter(Boolean);
			return parts.join('');
		}
		return '';
	} catch (e) {
		console.error('Translate failed', e);
		return '';
	}
};

const toDateOnly = (val: unknown): string => {
	if (!val) return '';
	if (typeof val === 'string') {
		// If it looks like an ISO timestamp, convert to local date
		if (val.includes('T')) {
			const d = new Date(val);
			if (!isNaN(d.getTime())) {
				const y = d.getFullYear();
				const m = `${d.getMonth() + 1}`.padStart(2, '0');
				const dd = `${d.getDate()}`.padStart(2, '0');
				return `${y}-${m}-${dd}`;
			}
		}
		// Plain 'YYYY-MM-DD' or 'YYYY-MM-DD HH:mm:ss'
		if (val.length >= 10) return val.slice(0, 10);
		return val;
	}
	if (val instanceof Date) {
		const y = val.getFullYear();
		const m = `${val.getMonth() + 1}`.padStart(2, '0');
		const d = `${val.getDate()}`.padStart(2, '0');
		return `${y}-${m}-${d}`;
	}
	try {
		const d = new Date(String(val));
		if (!isNaN(d.getTime())) {
			const y = d.getFullYear();
			const m = `${d.getMonth() + 1}`.padStart(2, '0');
			const dd = `${d.getDate()}`.padStart(2, '0');
			return `${y}-${m}-${dd}`;
		}
	} catch { }
	return '';
};

type ColonyOption = { colony_id: number; colony_name: string };

// Safe extractor to read colony_id without using 'any'
const getColonyId = (v: unknown): string => {
	if (typeof v === 'object' && v !== null && 'colony_id' in v) {
		const cid = (v as { colony_id?: unknown }).colony_id;
		if (typeof cid === 'number' || typeof cid === 'string') return String(cid);
	}
	return '';
};

interface VoterEditModalProps {
	isOpen: boolean;
	onClose: () => void;
	voter: voterdayatype | null;
	onUpdate: (updated: voterdayatype) => void;
	mode?: 'edit' | 'create';
}

const VoterEditModal: React.FC<VoterEditModalProps> = ({
	isOpen,
	onClose,
	voter,
	onUpdate,
	mode = 'edit',
}) => {
	const [colonies, setColonies] = useState<ColonyOption[]>([]);
	const [loadingColonies, setLoadingColonies] = useState(false);

	const [formData, setFormData] = useState({
		colony_entry_id: '',
		colony_id: '',
		colony_name: '',
		house_number: '',
		first_name: '',
		middle_name: '',
		last_name: '',
		first_name_mr: '',
		middle_name_mr: '',
		last_name_mr: '',
		voter_number: '',
		gender: '',
		relation: '',
		availability: '',
		dob: '',
		aadhaar_number: '',
		booth_number: '',
		mobile: '',
	});

	// Name suggestions and UI state
	const [nameSuggestions, setNameSuggestions] = useState<{
		first_name: { en: string; mr: string }[];
		middle_name: { en: string; mr: string }[];
		last_name: { en: string; mr: string }[];
	}>({ first_name: [], middle_name: [], last_name: [] });
	const [activeField, setActiveField] = useState<string>('');
	let debounceRef = (useState<NodeJS.Timeout | null>(null)[0]) as NodeJS.Timeout | null;

	// Track suggestion selection and manual Marathi edits
	const [selectedFromSuggestion, setSelectedFromSuggestion] = useState<{ first_name: boolean; middle_name: boolean; last_name: boolean }>({
		first_name: false,
		middle_name: false,
		last_name: false,
	});
	const [mrEdited, setMrEdited] = useState<{ first_name_mr: boolean; middle_name_mr: boolean; last_name_mr: boolean }>({
		first_name_mr: false,
		middle_name_mr: false,
		last_name_mr: false,
	});

	const [saving, setSaving] = useState(false);
	const [errors, setErrors] = useState<{ [k: string]: string }>({});

	useEffect(() => {
		if (!isOpen) return;
		(async () => {
			try {
				setLoadingColonies(true);
				const res = await fetch('/api/colony');
				if (res.ok) {
					const list = await res.json();
					setColonies(list || []);
				}
			} finally {
				setLoadingColonies(false);
			}
		})();
	}, [isOpen]);

	const ddMmYyyyToIso = (ddmmyyyy: string): string => {
		const parts = ddmmyyyy.split('-');
		if (parts.length !== 3) return '';
		return `${parts[2]}-${parts[1]}-${parts[0]}`;
	};
	useEffect(() => {
		if (mode === 'edit' && voter) {
			setFormData({
				colony_entry_id: voter.colony_entry_id || '',
				colony_id: getColonyId(voter),
				colony_name: voter.colony_name || '',
				house_number: voter.house_number || '',
				first_name: voter.first_name || '',
				middle_name: voter.middle_name || '',
				last_name: voter.last_name || '',
				first_name_mr: voter.first_name_mr || '',

				middle_name_mr: voter.middle_name_mr || '',
				last_name_mr: voter.last_name_mr || '',
				voter_number: voter.voter_number || '',
				gender: voter.gender || '',
				relation: voter.relation || '',
				availability: voter.availability || '',
				dob: ddMmYyyyToIso(toDateOnly(voter.dob)),
				aadhaar_number: voter.aadhaar_number || '',
				booth_number: voter.booth_number || '',
				mobile: voter.mobile || '',
			});
			// setDob(ddMmYyyyToIso(toDateOnly(voter.dob)));
			setErrors({});
		}



	}, [voter, mode]);

	// After colonies load, backfill colony_id if missing by matching colony_name
	useEffect(() => {
		if (!isOpen || !voter || !colonies.length) return;
		if (!formData.colony_id && voter.colony_name) {
			const match = colonies.find(c => c.colony_name === voter.colony_name);
			if (match?.colony_id) {
				setFormData(prev => ({ ...prev, colony_id: String(match.colony_id) }));
			}
		}
	}, [isOpen, voter, colonies, formData.colony_id]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
		console.log("formData", name)
		console.log("value", e)
		if (name === 'first_name' || name === 'middle_name' || name === 'last_name') {
			setActiveField(name);
			setSelectedFromSuggestion((prev) => ({ ...prev, [name]: false }));
			triggerSuggestions(name as 'first_name' | 'middle_name' | 'last_name', value);
		}
		if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
	};
	const validate = () => {
		const e: Record<string, string> = {};
		if (mode === 'create' && !formData.colony_id) e.colony_entry_id = 'Colony is required';

		// if (!formData.first_name.trim()) e.first_name = 'First name is required';
		// if (!formData.last_name.trim()) e.last_name = 'Last name is required';
		// if (!formData.gender) e.gender = 'Gender is required';
		// if (!formData.relation) e.relation = 'Relation is required';
		// if (!formData.availability) e.availability = 'Availability is required';
		// if (!formData.mobile.trim()) e.mobile = 'Mobile number is required';
		// else if (!/^\d{10}$/.test(formData.mobile)) e.mobile = 'Mobile must be 10 digits';
		// if (!formData.voter_number.trim()) e.voter_number = 'Voter number is required';
		// if (!formData.aadhaar_number.trim()) e.aadhaar_number = 'Aadhaar is required';
		// else if (!/^\d{12}$/.test(formData.aadhaar_number)) e.aadhaar_number = 'Aadhaar must be 12 digits';
		// if (!formData.booth_number.trim()) e.booth_number = 'Booth number is required';
		// if (!formData.dob) e.dob = 'DOB is required';
		setErrors(e);
		return Object.keys(e).length === 0;
	};



	// Suggestion fetching
	const triggerSuggestions = async (field: 'first_name' | 'middle_name' | 'last_name', value: string) => {
		if (debounceRef) clearTimeout(debounceRef);
		debounceRef = setTimeout(async () => {
			try {
				if (!value?.trim()) {
					setNameSuggestions((prev) => ({ ...prev, [field]: [] }));
					return;
				}
				const res = await fetch(`/api/voter-suggestions?field=${field}&query=${encodeURIComponent(value)}`);
				const json = await res.json();
				const list = Array.isArray(json?.suggestions) ? json.suggestions : [];
				setNameSuggestions((prev) => ({ ...prev, [field]: list }));
			} catch {
				setNameSuggestions((prev) => ({ ...prev, [field]: [] }));
			}
		}, 200);
	};

	// Auto-fill Marathi on blur when no suggestion used or no matching suggestion
	const autoFillMarathiFromEnglish = async (field: 'first_name' | 'middle_name' | 'last_name') => {
		const mrField =
			field === 'first_name' ? 'first_name_mr' :
				field === 'middle_name' ? 'middle_name_mr' :
					'last_name_mr';

		if (mrEdited[mrField]) return; // respect manual edits

		const en = (formData)[field] as string;
		if (!en?.trim()) return;

		// try suggestion match first
		const list = (nameSuggestions)[field] as { en: string; mr: string }[];
		const match = list?.find(x => x.en?.toLowerCase() === en.toLowerCase());
		if (match && match.mr) {
			setFormData((prev) => ({ ...prev, [mrField]: match.mr }));
			return;
		}
		if (selectedFromSuggestion[field]) return;

		// fallback translate
		const translated = await translateText(en);
		if (translated) {
			setFormData((prev) => ({ ...prev, [mrField]: translated }));
		}
	};
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validate()) return;
	  
		setSaving(true);
		try {
		  const method = mode === "edit" ? "PUT" : "POST";
		  const dobIso = ddMmYyyyToIso(formData.dob);
	  
		  const res = await fetch("/api/voterdetails", {
			method,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
			  ...formData,
			  dob: dobIso,
			  voter_id: voter?.voter_id,
			}),
		  });
	  
		  const json = await res.json();
		  if (!res.ok) throw new Error(json?.error || "Request failed");
	  
		  const updated: voterdayatype | null = json?.data || null;
		  if (updated) onUpdate(updated);
	  
		  toast.success(mode === "edit" ? "Voter updated" : "Voter created");
		  onClose();
		} catch (err) {
		  console.error(err);
		  toast.error(err instanceof Error ? err.message : "Operation failed");
		} finally {
		  setSaving(false);
		}
	  };
	  
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
			<div className="relative w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl">
				<div className="flex items-center justify-between px-6 py-4 border-b">
					<h3 className="text-lg font-semibold">{mode === 'edit' ? 'Edit Voter' : 'Add Voter'}</h3>
					<button type="button" onClick={onClose} className="p-2 rounded hover:bg-gray-100" aria-label="Close">✕</button>
				</div>

				<form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						<div>
							<label className="block text-sm font-medium mb-1">Colony</label>
							<select
								disabled
								value={formData.colony_id}
								name="colony_id"
								onChange={handleChange}
								className="w-full p-2 border rounded border-gray-300"
							>
								<option value="">{loadingColonies ? 'Loading...' : 'Select Colony'}</option>
								{colonies.map((c) => (
									<option key={c.colony_id} value={String(c.colony_id)}>
										{c.colony_name}
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium mb-1">House No</label>
							<input name="house_number" disabled value={formData.house_number} onChange={handleChange} className="w-full p-2 border rounded border-gray-300" />
						</div>
						{/* Booth */}
						<div>
							<label className="block text-sm font-medium mb-1">बूथ क्रमांक *</label>
							<input name="booth_number" value={formData.booth_number} onChange={handleChange} className={`w-full p-2 border rounded ${errors.booth_number ? 'border-red-500' : 'border-gray-300'}`} />
							{errors.booth_number && <span className="text-xs text-red-500">{errors.booth_number}</span>}
						</div>

						{/* English names */}
						<div>
							<label className="block text-sm font-medium mb-1">First Name (English)</label>
							<div className="relative">
								<input
									name="first_name"
									value={formData.first_name}
									onChange={handleChange}
									onFocus={() => setActiveField('first_name')}
									onBlur={() => {
										setTimeout(() => setActiveField(''), 200);
										setTimeout(() => { autoFillMarathiFromEnglish('first_name'); }, 220);
									}}
									className={`w-full p-2 border rounded ${errors.first_name ? 'border-red-500' : 'border-gray-300'}`}
								/>
								{activeField === 'first_name' && nameSuggestions.first_name.length > 0 && (
									<ul className="absolute z-10 mt-1 w-full max-h-48 overflow-auto border border-gray-300 bg-white rounded shadow">
										{nameSuggestions.first_name.map((s) => (
											<li
												key={`fn-${s.en}`}
												className="px-2 py-1 cursor-pointer hover:bg-gray-100"
												onMouseDown={() => {
													setFormData((prev) => ({
														...prev,
														first_name: s.en,
														first_name_mr: prev.first_name_mr || s.mr || ''
													}));
													setNameSuggestions((prev) => ({ ...prev, first_name: [] }));
													setSelectedFromSuggestion((prev) => ({ ...prev, first_name: true }));
													setActiveField('');
												}}
											>
												{s.en}{s.mr ? ` (${s.mr})` : ''}
											</li>
										))}
									</ul>
								)}
							</div>
							{errors.first_name && <span className="text-xs text-red-500">{errors.first_name}</span>}
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">Middle Name (English)</label>
							<div className="relative">
								<input
									name="middle_name"
									value={formData.middle_name}
									onChange={handleChange}
									onFocus={() => setActiveField('middle_name')}
									onBlur={() => {
										setTimeout(() => setActiveField(''), 200);
										setTimeout(() => { autoFillMarathiFromEnglish('middle_name'); }, 220);
									}}
									className="w-full p-2 border rounded border-gray-300"
								/>
								{activeField === 'middle_name' && nameSuggestions.middle_name.length > 0 && (
									<ul className="absolute z-10 mt-1 w-full max-h-48 overflow-auto border border-gray-300 bg-white rounded shadow">
										{nameSuggestions.middle_name.map((s) => (
											<li
												key={`mn-${s.en}`}
												className="px-2 py-1 cursor-pointer hover:bg-gray-100"
												onMouseDown={() => {
													setFormData((prev) => ({
														...prev,
														middle_name: s.en,
														middle_name_mr: prev.middle_name_mr || s.mr || ''
													}));
													setNameSuggestions((prev) => ({ ...prev, middle_name: [] }));
													setSelectedFromSuggestion((prev) => ({ ...prev, middle_name: true }));
													setActiveField('');
												}}
											>
												{s.en}{s.mr ? ` (${s.mr})` : ''}
											</li>
										))}
									</ul>
								)}
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">Last Name (English)</label>
							<div className="relative">
								<input
									name="last_name"
									value={formData.last_name}
									onChange={handleChange}
									onFocus={() => setActiveField('last_name')}
									onBlur={() => {
										setTimeout(() => setActiveField(''), 200);
										setTimeout(() => { autoFillMarathiFromEnglish('last_name'); }, 220);
									}}
									className={`w-full p-2 border rounded ${errors.last_name ? 'border-red-500' : 'border-gray-300'}`}
								/>
								{activeField === 'last_name' && nameSuggestions.last_name.length > 0 && (
									<ul className="absolute z-10 mt-1 w-full max-h-48 overflow-auto border border-gray-300 bg-white rounded shadow">
										{nameSuggestions.last_name.map((s) => (
											<li
												key={`ln-${s.en}`}
												className="px-2 py-1 cursor-pointer hover:bg-gray-100"
												onMouseDown={() => {
													setFormData((prev) => ({
														...prev,
														last_name: s.en,
														last_name_mr: prev.last_name_mr || s.mr || ''
													}));
													setNameSuggestions((prev) => ({ ...prev, last_name: [] }));
													setSelectedFromSuggestion((prev) => ({ ...prev, last_name: true }));
													setActiveField('');
												}}
											>
												{s.en}{s.mr ? ` (${s.mr})` : ''}
											</li>
										))}
									</ul>
								)}
							</div>
							{errors.last_name && <span className="text-xs text-red-500">{errors.last_name}</span>}
						</div>

						{/* Marathi names */}
						<div>
							<label className="block text-sm font-medium mb-1">पहिले नाव (Marathi)</label>
							<input
								name="first_name_mr"
								value={formData.first_name_mr}
								onChange={(e) => { handleChange(e); if (!mrEdited.first_name_mr) setMrEdited((p) => ({ ...p, first_name_mr: true })); }}
								className="w-full p-2 border rounded border-gray-300"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">मधले नाव (Marathi)</label>
							<input
								name="middle_name_mr"
								value={formData.middle_name_mr}
								onChange={(e) => { handleChange(e); if (!mrEdited.middle_name_mr) setMrEdited((p) => ({ ...p, middle_name_mr: true })); }}
								className="w-full p-2 border rounded border-gray-300"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">आडनाव (Marathi)</label>
							<input
								name="last_name_mr"
								value={formData.last_name_mr}
								onChange={(e) => { handleChange(e); if (!mrEdited.last_name_mr) setMrEdited((p) => ({ ...p, last_name_mr: true })); }}
								className="w-full p-2 border rounded border-gray-300"
							/>
						</div>
						{/* Gender */}
						<div>
							<label className="block text-sm font-medium mb-1">Gender</label>
							<select name="gender" value={formData.gender} onChange={handleChange} className={`w-full p-2 border rounded ${errors.gender ? 'border-red-500' : 'border-gray-300'}`}>
								<option value="">Select</option>
								<option value="male">Male</option>
								<option value="female">Female</option>
								<option value="Transgender">Transgender</option>
							</select>
							{errors.gender && <span className="text-xs text-red-500">{errors.gender}</span>}
						</div>

						{/* Availability */}
						<div>
							<label className="block text-sm font-medium mb-1">Availability</label>
							<select name="availability" value={formData.availability} onChange={handleChange} className={`w-full p-2 border rounded ${errors.availability ? 'border-red-500' : 'border-gray-300'}`}>
								<option value="">Select</option>
								<option value="In House">In House</option>
								<option value="Out Of Station">Out Of Station</option>
							</select>
							{errors.availability && <span className="text-xs text-red-500">{errors.availability}</span>}
						</div>
						{/* Relation */}						
						<div>
							<label className="block text-sm font-medium mb-1">Relation</label>
							<select name="relation" value={formData.relation} onChange={handleChange} className={`w-full p-2 border rounded ${errors.relation ? 'border-red-500' : 'border-gray-300'}`}>
								<option value="">Select</option>
								<option value="Primary Person">Primary Person</option>
								<option value="Spouse">Spouse</option>
								<option value="Son">Son</option>
								<option value="Daughter">Daughter</option>
								<option value="Father">Father</option>
								<option value="Mother">Mother</option>
								<option value="Brother">Brother</option>
								<option value="Sister">Sister</option>
								<option value="Other">Other</option>
							</select>
							{errors.relation && <span className="text-xs text-red-500">{errors.relation}</span>}
						</div>

						{/* DOB */}
						<div>
							<label className="block text-sm font-medium mb-1">जन्मतारीख (DOB)</label>
							<input
								type="text"
								name="dob"
								value={formData.dob}
								placeholder="dd-mm-yyyy"
								onChange={(e) => {
									let val = e.target.value;

									// Allow only digits and dashes, max length 10
									if (/^[0-9-]{0,10}$/.test(val)) {
										// Automatically insert dashes at positions 2 and 5
										if (val.length === 2 && formData.dob.length < val.length) val += '-';
										if (val.length === 5 && formData.dob.length < val.length) val += '-';

										setFormData(prev => ({ ...prev, dob: val }));
										// Optional: validate date format and set errors if needed
										if (!/^\d{2}-\d{2}-\d{4}$/.test(val)) {
											setErrors(prev => ({ ...prev, dob: 'Invalid date format' }));
										
										}
									}
								}}
								className={`w-full p-2 border rounded ${errors.dob ? 'border-red-500' : 'border-gray-300'}`}
							/>
							{errors.dob && <span className="text-xs text-red-500">{errors.dob}</span>}
						</div>

						{/* Mobile */}
						<div>
							<label className="block text-sm font-medium mb-1">मोबाईल क्रमांक</label>
							<input name="mobile" value={formData.mobile} onChange={handleChange} maxLength={10} className={`w-full p-2 border rounded ${errors.mobile ? 'border-red-500' : 'border-gray-300'}`} />
							{errors.mobile && <span className="text-xs text-red-500">{errors.mobile}</span>}
						</div>

						{/* Voter No */}
						<div>
							<label className="block text-sm font-medium mb-1">मतदार ओळख क्रमांक</label>
							<input name="voter_number" value={formData.voter_number} onChange={handleChange} className={`w-full p-2 border rounded ${errors.voter_number ? 'border-red-500' : 'border-gray-300'}`} />
							{errors.voter_number && <span className="text-xs text-red-500">{errors.voter_number}</span>}
						</div>

						{/* Aadhaar */}
						<div>
							<label className="block text-sm font-medium mb-1">आधार क्रमांक</label>
							<input name="aadhaar_number" value={formData.aadhaar_number} onChange={handleChange} maxLength={12} className={`w-full p-2 border rounded ${errors.aadhaar_number ? 'border-red-500' : 'border-gray-300'}`} />
							{errors.aadhaar_number && <span className="text-xs text-red-500">{errors.aadhaar_number}</span>}
						</div>


					</div>

					<div className="flex justify-end gap-2 mt-6">
						<button type="button" onClick={onClose} className="px-4 py-2 rounded border border-gray-300 bg-gray-100">Cancel</button>
						<button type="submit" disabled={saving} className="px-4 py-2 rounded bg-blue-600 text-white">{saving ? 'Updating...' : (mode === 'edit' ? 'Update' : 'Create')}</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default VoterEditModal;