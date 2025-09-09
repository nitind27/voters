"use client";

import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { voterdayatype } from './Votertype';

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
	} catch {}
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
				dob: toDateOnly(voter.dob),
				aadhaar_number: voter.aadhaar_number || '',
				booth_number: voter.booth_number || '',
				mobile: voter.mobile || '',
			});
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
		if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
	};

	const validate = () => {
		const e: Record<string, string> = {};
		if (mode === 'create' && !formData.colony_id) e.colony_entry_id = 'Colony is required';

		if (!formData.first_name.trim()) e.first_name = 'First name is required';
		if (!formData.last_name.trim()) e.last_name = 'Last name is required';
		if (!formData.gender) e.gender = 'Gender is required';
		if (!formData.relation) e.relation = 'Relation is required';
		if (!formData.availability) e.availability = 'Availability is required';
		if (!formData.mobile.trim()) e.mobile = 'Mobile number is required';
		else if (!/^\d{10}$/.test(formData.mobile)) e.mobile = 'Mobile must be 10 digits';
		if (!formData.voter_number.trim()) e.voter_number = 'Voter number is required';
		if (!formData.aadhaar_number.trim()) e.aadhaar_number = 'Aadhaar is required';
		else if (!/^\d{12}$/.test(formData.aadhaar_number)) e.aadhaar_number = 'Aadhaar must be 12 digits';
		if (!formData.booth_number.trim()) e.booth_number = 'Booth number is required';
		if (!formData.dob) e.dob = 'DOB is required';
		setErrors(e);
		return Object.keys(e).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validate()) return;

		setSaving(true);
		try {
			const method = mode === 'edit' ? 'PUT' : 'POST';
			const res = await fetch('/api/voterdetails', {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...formData,
					voter_id: voter?.voter_id,
				}),
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json?.error || 'Request failed');

			const updated: voterdayatype | null = json?.data || null;
			if (updated) onUpdate(updated);

			toast.success(mode === 'edit' ? 'Voter updated' : 'Voter created');
			onClose();
		} catch (err) {
			console.error(err);
			toast.error(err instanceof Error ? err.message : 'Operation failed');
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
								disabled={loadingColonies}
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
							<input name="house_number" value={formData.house_number} onChange={handleChange} className="w-full p-2 border rounded border-gray-300" />
						</div>
						{/* Booth */}
						<div>
							<label className="block text-sm font-medium mb-1">बूथ क्रमांक *</label>
							<input name="booth_number" value={formData.booth_number} onChange={handleChange} className={`w-full p-2 border rounded ${errors.booth_number ? 'border-red-500' : 'border-gray-300'}`} />
							{errors.booth_number && <span className="text-xs text-red-500">{errors.booth_number}</span>}
						</div>

						{/* English names */}
						<div>
							<label className="block text-sm font-medium mb-1">First Name (English) *</label>
							<input name="first_name" value={formData.first_name} onChange={handleChange} className={`w-full p-2 border rounded ${errors.first_name ? 'border-red-500' : 'border-gray-300'}`} />
							{errors.first_name && <span className="text-xs text-red-500">{errors.first_name}</span>}
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">Middle Name (English)</label>
							<input name="middle_name" value={formData.middle_name} onChange={handleChange} className="w-full p-2 border rounded border-gray-300" />
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">Last Name (English) *</label>
							<input name="last_name" value={formData.last_name} onChange={handleChange} className={`w-full p-2 border rounded ${errors.last_name ? 'border-red-500' : 'border-gray-300'}`} />
							{errors.last_name && <span className="text-xs text-red-500">{errors.last_name}</span>}
						</div>

						{/* Marathi names */}
						<div>
							<label className="block text-sm font-medium mb-1">पहिले नाव (Marathi)</label>
							<input name="first_name_mr" value={formData.first_name_mr} onChange={handleChange} className="w-full p-2 border rounded border-gray-300" />
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">मधले नाव (Marathi)</label>
							<input name="middle_name_mr" value={formData.middle_name_mr} onChange={handleChange} className="w-full p-2 border rounded border-gray-300" />
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">आडनाव (Marathi)</label>
							<input name="last_name_mr" value={formData.last_name_mr} onChange={handleChange} className="w-full p-2 border rounded border-gray-300" />
						</div>

						{/* Gender */}
						<div>
							<label className="block text-sm font-medium mb-1">Gender *</label>
							<select name="gender" value={formData.gender} onChange={handleChange} className={`w-full p-2 border rounded ${errors.gender ? 'border-red-500' : 'border-gray-300'}`}>
								<option value="">Select</option>
								<option value="Male">Male</option>
								<option value="Female">Female</option>
								<option value="Transgender">Transgender</option>
							</select>
							{errors.gender && <span className="text-xs text-red-500">{errors.gender}</span>}
						</div>

						{/* Availability */}
						<div>
							<label className="block text-sm font-medium mb-1">Availability *</label>
							<select name="availability" value={formData.availability} onChange={handleChange} className={`w-full p-2 border rounded ${errors.availability ? 'border-red-500' : 'border-gray-300'}`}>
								<option value="">Select</option>
								<option value="In House">In House</option>
								<option value="Out Of Station">Out Of Station</option>
							</select>
							{errors.availability && <span className="text-xs text-red-500">{errors.availability}</span>}
						</div>

						{/* Relation */}
						<div>
							<label className="block text-sm font-medium mb-1">Relation *</label>
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
							<label className="block text-sm font-medium mb-1">जन्मतारीख (DOB) *</label>
							<input type="date" name="dob" value={formData.dob} onChange={handleChange} className={`w-full p-2 border rounded ${errors.dob ? 'border-red-500' : 'border-gray-300'}`} />
							{errors.dob && <span className="text-xs text-red-500">{errors.dob}</span>}
						</div>

						{/* Mobile */}
						<div>
							<label className="block text-sm font-medium mb-1">मोबाईल क्रमांक *</label>
							<input name="mobile" value={formData.mobile} onChange={handleChange} maxLength={10} className={`w-full p-2 border rounded ${errors.mobile ? 'border-red-500' : 'border-gray-300'}`} />
							{errors.mobile && <span className="text-xs text-red-500">{errors.mobile}</span>}
						</div>

						{/* Voter No */}
						<div>
							<label className="block text-sm font-medium mb-1">मतदार ओळख क्रमांक *</label>
							<input name="voter_number" value={formData.voter_number} onChange={handleChange} className={`w-full p-2 border rounded ${errors.voter_number ? 'border-red-500' : 'border-gray-300'}`} />
							{errors.voter_number && <span className="text-xs text-red-500">{errors.voter_number}</span>}
						</div>

						{/* Aadhaar */}
						<div>
							<label className="block text-sm font-medium mb-1">आधार क्रमांक *</label>
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