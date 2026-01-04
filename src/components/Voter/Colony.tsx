"use client";

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FaEdit } from 'react-icons/fa';

import Label from "../form/Label";
import { ReusableTable } from "../tables/BasicTableOne";
import { Column } from "../tables/tabletype";
import DefaultModal from '../example/ModalExample/DefaultModal';
import { useToggleContext } from '@/context/ToggleContext';

// Define proper types
interface Colony {
    colony_id: number;
    colony_name: string;
    status: string;
    created_at: string;
    updated_at: string;
}

type FormErrors = {
    colony_name?: string;
};

type Props = {
    colonies: Colony[];
};

const Colony = ({ colonies: initialColonies }: Props) => {
    const [colonies, setColonies] = useState<Colony[]>(initialColonies);
    const [colonyName, setColonyName] = useState('');
    const [editId, setEditId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setErrors] = useState<FormErrors>({});
    
    const { isActive, setIsActive, isEditMode, setIsEditmode, setIsmodelopen, isvalidation, setisvalidation } = useToggleContext();

    // Fetch colonies data
    const fetchColonies = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/colony');
            if (!response.ok) {
                throw new Error('Failed to fetch colonies');
            }
            const result = await response.json();
            setColonies(result);
        } catch (error) {
            console.error('Error fetching colonies:', error);
            toast.error('Failed to fetch colonies');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isvalidation) {
            setErrors({});
        }
    }, [isvalidation]);

    const reset = () => {
        setColonyName('');
        setEditId(null);
    };

    useEffect(() => {
        if (!isEditMode) {
            reset();
        }
    }, [isEditMode]);

    const validateInputs = () => {
        const newErrors: FormErrors = {};
        setisvalidation(true);

        if (!colonyName || colonyName.trim().length === 0) {
            newErrors.colony_name = "Colony name is required";
        } else if (colonyName.trim().length < 2) {
            newErrors.colony_name = "Colony name must be at least 2 characters";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateInputs()) return;
        
        setLoading(true);
        const apiUrl = '/api/colony';
        const method = isEditMode ? 'PUT' : 'POST';

        try {
            const response = await fetch(apiUrl, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    colony_id: editId,
                    colony_name: colonyName.trim(),
                    status: 'Active'
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save colony');
            }

            toast.success(editId ? 'Colony updated successfully!' : 'Colony created successfully!');
            reset();
            setEditId(null);
            fetchColonies();
        } catch (error) {
            console.error('Error saving colony:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to save colony');
        } finally {
            setLoading(false);
            setIsmodelopen(false);
        }
    };

    const handleEdit = (colony: Colony) => {
        setIsActive(!isActive);
        setIsmodelopen(true);
        setIsEditmode(true);
        setEditId(colony.colony_id);
        setColonyName(colony.colony_name);
    };

    // const handleAddNew = () => {
    //     setIsActive(!isActive);
    //     setIsmodelopen(true);
    //     setIsEditmode(false);
    //     reset();
    // };

    const columns: Column<Colony>[] = [
        
        {
            key: 'colony_name',
            label: 'Colony Name',
            accessor: 'colony_name',
            render: (data) => <span className="font-medium">{data.colony_name}</span>
        },
        {
            key: 'status',
            label: 'Status',
            accessor: 'status',
            render: (data) => (
                <span className={`px-2 py-1 rounded-full text-xs ${
                    data.status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                }`}>
                    {data.status}
                </span>
            )
        },
        // {
        //     key: 'created_at',
        //     label: 'Created At',
        //     accessor: 'created_at',
        //     render: (data) => (
        //         <span className="text-sm text-gray-600">
        //             {new Date(data.created_at).toLocaleDateString()}
        //         </span>
        //     )
        // },
        {
            key: 'actions',
            label: 'Actions',
            render: (data) => (
                <div className="flex gap-2 whitespace-nowrap w-full">
                    <span
                        onClick={() => handleEdit(data)}
                        className="cursor-pointer text-blue-600 hover:text-blue-800 transition-colors duration-200"
                        title="Edit Colony"
                    >
                        <FaEdit className="inline-block align-middle text-lg" />
                    </span>
                    <span>
                        <DefaultModal 
                            id={data.colony_id} 
                            fetchData={fetchColonies} 
                            endpoint="colony" 
                            bodyname="colony_id" 
                            newstatus={data.status}
                        />
                    </span>
                </div>
            )
        }
    ];

    return (
        <div className="">
        

            <ReusableTable
                data={colonies}
                classname="h-auto overflow-y-auto scrollbar-hide" 
                inputfiled={
                    <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-1">
                        <div className="col-span-1">
                            <Label>Colony Name</Label>
                            <input
                                type="text"
                                placeholder="Enter colony name"
                                className={`h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 ${
                                    error.colony_name ? "border-red-500" : ""
                                }`}
                                value={colonyName}
                                onChange={(e) => setColonyName(e.target.value)}
                            />
                            {error.colony_name && (
                                <div className="text-red-500 text-sm mt-1 pl-1">
                                    {error.colony_name}
                                </div>
                            )}
                        </div>
                    </div>
                }
                columns={columns}
                title="Colonies"
                filterOptions={[]}
                submitbutton={
                    <button
                        type="button"
                        onClick={handleSave}
                        className="bg-blue-700 text-white py-2 px-4 rounded hover:bg-blue-800 transition-colors duration-200 disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? 'Submitting...' : (editId ? 'Update Colony' : 'Submit')}
                    </button>
                }
                searchKey="colony_name"
            />
        </div>
    );
};

export default Colony;
