"use client";

import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'react-toastify';


// Simple client-side translator using Google Translate public endpoint
const translateText = async (text: string): Promise<string> => {
    if (!text?.trim()) return '';
    try {
        const res = await fetch(
            `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=mr&dt=t&q=${encodeURIComponent(text)}`
        );
        const data = await res.json();
        const segments = (data?.[0] as unknown[]) || [];
        return segments.map((item) => (Array.isArray(item) ? String(item[0] ?? '') : '')).join('') || '';
    } catch (e) {
        console.error('Translate failed', e);
        return '';
    }
};

interface VoterAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void | Promise<void>; // ADD
}
// type ColonyOption = { colony_id: number; colony_name: string };

const Voteradddashboard: React.FC<VoterAddModalProps> = ({
    isOpen,
    onClose,
    onSuccess, // ADD
   

}) => {
    const [formData, setFormData] = useState({
        colony_id:  '',
        house_number:  '',
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
        photo: null as File | null,

        user_id: '',
        type_status: '',
    });
    type ColonyOption = { colony_id: number; colony_name: string };

    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<{ [k: string]: string }>({});
    // const [colonyList, setColonyList] = useState<{ id: string; name: string }[]>([]);
    const [colonies, setColonies] = useState<ColonyOption[]>([]);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const username = sessionStorage.getItem('userid');
    // const router = useRouter();
    const [nameSuggestions, setNameSuggestions] = useState<{
        first_name: { en: string; mr: string }[];
        middle_name: { en: string; mr: string }[];
        last_name: { en: string; mr: string }[];
        first_name_mr: { en: string; mr: string }[]; // unused currently but kept for consistency
    }>({ first_name: [], middle_name: [], last_name: [], first_name_mr: [] });
    const [activeField, setActiveField] = useState<string>('');
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Track if each name was chosen from suggestions (true) vs typed (false)
    // Track if each name was chosen from suggestions (true) vs typed (false)
    const [selectedFromSuggestion, setSelectedFromSuggestion] = useState<{
        first_name: boolean;
        middle_name: boolean;
        last_name: boolean;
    }>({ first_name: false, middle_name: false, last_name: false });

    // Track if Marathi fields were manually edited to avoid overwriting
    const [mrEdited, setMrEdited] = useState<{ first_name_mr: boolean; middle_name_mr: boolean; last_name_mr: boolean }>({
        first_name_mr: false,
        middle_name_mr: false,
        last_name_mr: false,
    });

  

    useEffect(() => {
        if (!isOpen) return;
        (async () => {
            try {

                const res = await fetch('/api/colony');
                if (res.ok) {
                    const list = await res.json();
                    setColonies(list || []);
                }
            } finally {

            }
        })();
    }, [isOpen]);

  
    useEffect(() => {
        const uid = sessionStorage.getItem('userid') || '';
        setFormData(prev => ({ ...prev, user_id: uid }));
    }, []);


    useEffect(() => {
        return () => {
            if (photoPreview) URL.revokeObjectURL(photoPreview);
        };
    }, [photoPreview]);
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        if (name === 'Voterlist') {
            setFormData((prev) => ({ ...prev, [name]: Number(value) }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
            if (name === 'first_name' || name === 'middle_name' || name === 'last_name') {
                setActiveField(name);
                // User is typing -> mark as not selected from suggestions
                setSelectedFromSuggestion((prev) => ({ ...prev, [name]: false }));
                triggerSuggestions(name as 'first_name' | 'middle_name' | 'last_name', value);
            }
        }
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData((prev) => ({ ...prev, photo: file }));
            setPhotoPreview((prevUrl) => {
                if (prevUrl) URL.revokeObjectURL(prevUrl);
                return URL.createObjectURL(file);
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setSaving(true);
        try {
            // Get colony_entry_id from colony_id and house_number
            const colonyEntryRes = await fetch(
                `/api/colony-entry?colony_id=${formData.colony_id}&house_number=${formData.house_number}`
            );
            const colonyEntryData = await colonyEntryRes.json();

            let colony_entry_id;
            if (colonyEntryData.length > 0) {
                colony_entry_id = colonyEntryData[0].colony_entry_id;
            } else {
                // Create new colony entry if doesn't exist
                const createEntryRes = await fetch('/api/colony-entry', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        colony_id: formData.colony_id,
                        house_number: formData.house_number,
                    }),
                });
                const createEntryData = await createEntryRes.json();
                colony_entry_id = createEntryData.colony_entry_id;
            }

            // Decide type_status: blank if all 3 names selected from suggestions; else 'New'
            const typeStatus =
                (selectedFromSuggestion.first_name &&
                    selectedFromSuggestion.middle_name &&
                    selectedFromSuggestion.last_name)
                    ? ''
                    : 'New';

            // Construct formData for submission including photo and new fields
            const submitData = new FormData();
            submitData.append('colony_entry_id', colony_entry_id);
            submitData.append('colony_id', formData.colony_id);
            submitData.append('house_number', formData.house_number);
            submitData.append('first_name', formData.first_name);
            submitData.append('middle_name', formData.middle_name);
            submitData.append('last_name', formData.last_name);
            submitData.append('first_name_mr', formData.first_name_mr);
            submitData.append('middle_name_mr', formData.middle_name_mr);
            submitData.append('last_name_mr', formData.last_name_mr);
            submitData.append('voter_number', formData.voter_number);
            submitData.append('gender', formData.gender);
            submitData.append('relation', formData.relation);
            submitData.append('availability', formData.availability);
            submitData.append('dob', formData.dob);
            submitData.append('aadhaar_number', formData.aadhaar_number);
            submitData.append('booth_number', formData.booth_number);
            submitData.append('mobile', formData.mobile);
            submitData.append('user_id', username || '');
            submitData.append('type_status', typeStatus); // <-- add this

            if (formData.photo) {
                submitData.append('photo', formData.photo);
            }

            const res = await fetch('/api/voterdashboard', {
                method: 'POST',
                body: submitData,
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || 'Request failed');

            // const newVoter = (json?.data as voterdayatype) || null;
       
            toast.success('Voter added successfully');
            onClose();
            await onSuccess?.(); // TRIGGER PARENT REFRESH
            // router.refresh(); // REMOVE this line (no page reload)
            
            // Reset form
            setFormData({
                colony_id: formData.colony_id || '',
                house_number: formData.house_number || '',
                first_name: '',
                middle_name: '',
                last_name: '',
                first_name_mr: '',
                middle_name_mr: '',
                last_name_mr: '',
                voter_number: '',
                gender: '',
                relation: '',
                availability: 'In House',
                dob: '',
                aadhaar_number: '',
                booth_number: '',
                mobile: '',
                photo: null,

                user_id: '',
                type_status: '',
            });
            setSelectedFromSuggestion({ first_name: false, middle_name: false, last_name: false });
        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : 'Operation failed');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;
    const triggerSuggestions = async (
        field: 'first_name' | 'middle_name' | 'last_name',
        value: string
    ) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            try {
                if (!value) {
                    setNameSuggestions((prev) => ({ ...prev, [field]: [] }));
                    return;
                }
                const res = await fetch(
                    `/api/voter-suggestions?field=${field}&query=${encodeURIComponent(value)}`
                );
                const json = await res.json();
                const list = Array.isArray(json?.suggestions) ? json.suggestions : [];
                setNameSuggestions((prev) => ({ ...prev, [field]: list }));
            } catch {
                setNameSuggestions((prev) => ({ ...prev, [field]: [] }));
            }
        }, 200);
    };

    const autoFillMarathiFromEnglish = async (field: 'first_name' | 'middle_name' | 'last_name') => {
        const mrField =
            field === 'first_name' ? 'first_name_mr' :
                field === 'middle_name' ? 'middle_name_mr' :
                    'last_name_mr';

        // If user already edited Marathi manually, do not overwrite
        if (mrEdited[mrField]) return;

        const en = (formData as Record<'first_name' | 'middle_name' | 'last_name', string>)[field];
        if (!en?.trim()) return;

        // 1) Prefer a matching suggestion's Marathi if available
        const list = (nameSuggestions as Record<'first_name' | 'middle_name' | 'last_name', { en: string; mr: string }[]>)[field];
        const match = list?.find(x => x.en?.toLowerCase() === en.toLowerCase());
        if (match && match.mr) {
            setFormData((prev) => ({ ...prev, [mrField]: match.mr }));
            return;
        }

        // 2) If user explicitly selected a suggestion earlier, Marathi should already be set; skip
        if (selectedFromSuggestion[field]) return;

        // 3) Fallback: translate English -> Marathi
        const translated = await translateText(en);
        if (translated) {
            setFormData((prev) => ({ ...prev, [mrField]: translated }));
        }
    };
    return (
        <div
            className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50"
            role="dialog"
            aria-modal="true"
        >
            <div className="relative w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h3 className="text-lg font-semibold">Add New Voter</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded hover:bg-gray-100"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                    <div className="col-span-full flex items-center gap-4 justify-center">
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border border-gray-300">
                            {photoPreview ? (
                                <img src={photoPreview} alt="Selected photo" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No photo</div>
                            )}
                        </div>

                    </div>

                    <div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Colony</label>
                            <select

                                value={formData.colony_id}
                                name="colony_id"
                                onChange={handleChange}
                                className="w-full p-2 border rounded border-gray-300"
                            >
                                <option value="">{'Select Colony'}</option>
                                {colonies.map((c) => (
                                    <option key={c.colony_id} value={String(c.colony_id)}>
                                        {c.colony_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">House No</label>
                        <input
                            name="house_number"
                            value={formData.house_number}
                            onChange={handleChange}
                            className="w-full p-2 border rounded border-gray-300"
                            placeholder="House number"
                            required
                        />
                    </div>


                    {/* Booth Number */}
                    <div>
                        <label className="block text-sm font-medium mb-1">बूथ क्रमांक</label>
                        <input
                            name="booth_number"
                            value={formData.booth_number}
                            onChange={handleChange}
                            className="w-full p-2 border rounded border-gray-300"
                        />
                    </div>

                    {/* First Name */}
                    {/* First Name */}
                    <div className="relative">
                        <label className="block text-sm font-medium mb-1">First Name (English)</label>
                        <input
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                            onFocus={() => setActiveField('first_name')}
                            onBlur={() => {
                                // Close dropdown after allowing click selection, then auto-translate if needed
                                setTimeout(() => setActiveField(''), 200);
                                setTimeout(() => { autoFillMarathiFromEnglish('first_name'); }, 220);
                            }}
                            required
                            className="w-full p-2 border rounded border-gray-300"
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

                    {/* Middle Name */}
                    {/* Middle Name */}
                    <div className="relative">
                        <label className="block text-sm font-medium mb-1">Middle Name (English)</label>
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
                    {/* Last Name */}
                    {/* Last Name */}
                    <div className="relative">
                        <label className="block text-sm font-medium mb-1">Last Name (English)</label>
                        <input
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            onFocus={() => setActiveField('last_name')}
                            onBlur={() => {
                                setTimeout(() => setActiveField(''), 200);
                                setTimeout(() => { autoFillMarathiFromEnglish('last_name'); }, 220);
                            }}
                            required
                            className="w-full p-2 border rounded border-gray-300"
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
                    {/* Marathi names */}
                    <div>
                        <label className="block text-sm font-medium mb-1">पहिले नाव (Marathi)</label>
                        <input
                            name="first_name_mr"
                            value={formData.first_name_mr}
                            onChange={(e) => {
                                handleChange(e);
                                if (!mrEdited.first_name_mr) setMrEdited((p) => ({ ...p, first_name_mr: true }));
                            }}
                            className="w-full p-2 border rounded border-gray-300"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">मधले नाव (Marathi)</label>
                        <input
                            name="middle_name_mr"
                            value={formData.middle_name_mr}
                            onChange={(e) => {
                                handleChange(e);
                                if (!mrEdited.middle_name_mr) setMrEdited((p) => ({ ...p, middle_name_mr: true }));
                            }}
                            className="w-full p-2 border rounded border-gray-300"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">आडनाव (Marathi)</label>
                        <input
                            name="last_name_mr"
                            value={formData.last_name_mr}
                            onChange={(e) => {
                                handleChange(e);
                                if (!mrEdited.last_name_mr) setMrEdited((p) => ({ ...p, last_name_mr: true }));
                            }}
                            className="w-full p-2 border rounded border-gray-300"
                        />
                    </div>

                    {/* Gender */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Gender</label>
                        <select
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            className="w-full p-2 border rounded border-gray-300"
                        >
                            <option value="">Select</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="Transgender">Transgender</option>
                        </select>
                    </div>

                    {/* Availability */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Availability</label>
                        <select
                            name="availability"
                            value={formData.availability}
                            onChange={handleChange}
                            className="w-full p-2 border rounded border-gray-300"
                        >
                            <option value="">Select</option>
                            <option value="In House">In House</option>
                            <option value="Out Of Station">Out Of Station</option>
                        </select>
                    </div>

                    {/* Relation */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Relation</label>
                        <select
                            name="relation"
                            value={formData.relation}
                            onChange={handleChange}
                            className="w-full p-2 border rounded border-gray-300"
                        >
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
                    </div>

                    {/* DOB */}
                    <div>
                        <label className="block text-sm font-medium mb-1">जन्मतारीख (DOB)</label>
                        <input
                            type="date"
                            name="dob"
                            value={formData.dob}
                            onChange={handleChange}
                            className="w-full p-2 border rounded border-gray-300"
                        />
                    </div>

                    {/* Mobile */}
                    <div>
                        <label className="block text-sm font-medium mb-1">मोबाईल क्रमांक</label>
                        <input
                            name="mobile"
                            value={formData.mobile}
                            onChange={handleChange}
                            maxLength={10}
                            className="w-full p-2 border rounded border-gray-300"
                        />
                    </div>

                    {/* Voter Number */}
                    <div>
                        <label className="block text-sm font-medium mb-1">मतदार ओळख क्रमांक</label>
                        <input
                            name="voter_number"
                            value={formData.voter_number}
                            onChange={handleChange}
                            className="w-full p-2 border rounded border-gray-300"
                        />
                    </div>

                    {/* Aadhaar Number */}
                    <div>
                        <label className="block text-sm font-medium mb-1">आधार क्रमांक</label>
                        <input
                            name="aadhaar_number"
                            value={formData.aadhaar_number}
                            onChange={handleChange}
                            maxLength={12}
                            className="w-full p-2 border rounded border-gray-300"
                        />
                    </div>

                    {/* Photo upload */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Photo</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className="w-full p-2 border rounded border-gray-300"
                        />
                    </div>



                    {/* Submit buttons */}
                    <div className="flex justify-end gap-2 mt-6 col-span-full">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded border border-gray-300 bg-gray-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 rounded bg-blue-600 text-white"
                        >
                            {saving ? 'Submitting...' : 'Add Voter'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Voteradddashboard;
