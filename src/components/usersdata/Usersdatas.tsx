"use client";

import { useEffect, useState } from 'react';
// import * as XLSX from 'xlsx';
// import { saveAs } from 'file-saver';

import Label from "../form/Label";
import { ReusableTable } from "../tables/BasicTableOne";
import { Column } from "../tables/tabletype";

import { toast } from 'react-toastify';

import { UserData } from './Userdata';
import { useToggleContext } from '@/context/ToggleContext';
import { UserCategory } from '../usercategory/userCategory';

import DefaultModal from '../example/ModalExample/DefaultModal';
import { FaEdit } from 'react-icons/fa';
// import { Grampanchayattype } from '../grampanchayat/gptype';

// Update Colony interface to match database schema
interface Colony {
  colony_id: number;
  colony_name: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  full_name: string;
  booth_number: string;
  status: string;
  created_at: string;
  updated_at: string;
}

type Props = {
  users: UserData[];
  datausercategorycrud: UserCategory[];
  colonies: Colony[]; // Add colonies prop
  // grampanchayat: Grampanchayattype[];
};

type FormErrors = {
  usercategory?: string;
  name?: string;
  Contact?: string;
  Username?: string;
  Password?: string;
  colonies?: string; // Changed from address to colonies
  Taluka?: string;
  Village?: string;
  gp?: string;
};

const Usersdatas = ({ users, datausercategorycrud, colonies }: Props) => {
  const [data, setData] = useState<UserData[]>(users || []);
  const [usercategory, setUsercategory] = useState(0);
  const [name, setName] = useState('');
  const [Contact, setContact] = useState('');
  const [Username, setUsername] = useState('');
  const [Password, setPassword] = useState('');
  const [selectedColonies, setSelectedColonies] = useState<number[]>([]); // Changed from address to colonies
  // Remove the colonies state since it's now passed as prop
  // const [colonies, setColonies] = useState<Colony[]>([]);
  // const [Taluka, setTaluka] = useState(0);
  // const [Village, setVillage] = useState(0);
  const [gp, setgp] = useState(0);
  const [editId, setEditId] = useState<number | null>(null);
  const { isActive, setIsActive, isEditMode, setIsEditmode, setIsmodelopen, isvalidation, setisvalidation } = useToggleContext();
  const [loading, setLoading] = useState(false);
  const [error, setErrors] = useState<FormErrors>({});

  // Remove the fetchColonies function since colonies are now passed as props
  // const fetchColonies = async () => {
  //   try {
  //     const response = await fetch('/api/colony');
  //     const result = await response.json();
  //     setColonies(result);
  //   } catch (error) {
  //     console.error('Error fetching colonies:', error);
  //   }
  // };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users/insert');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false); // End loading
    }
  };

  // Remove the useEffect that calls fetchColonies
  // useEffect(() => {
  //   fetchColonies(); // Fetch colonies when component mounts
  // }, []);

  useEffect(() => {
    if (!isvalidation) {
      setErrors({})
    }
  }, [isvalidation])

  const reset = () => {
    setUsercategory(Number(""))
    setName("")
    setContact("")
    setUsername("")
    setPassword("")
    setSelectedColonies([]) // Changed from setaddress
    // setTaluka(Number(""))
    // setVillage(Number(""))
    setgp(Number(""))
    setEditId(0);
  }

  useEffect(() => {
    if (!isEditMode) {
      reset()
    }
  }, [isEditMode]);

  // Handle colony checkbox changes
  const handleColonyChange = (colonyId: number) => {
    setSelectedColonies(prev => {
      if (prev.includes(colonyId)) {
        return prev.filter(id => id !== colonyId);
      } else {
        return [...prev, colonyId];
      }
    });
  };

  const validateInputs = () => {
    const newErrors: FormErrors = {};
    setisvalidation(true)
    // Category validation

    // Documents validation
    if (!usercategory) {
      newErrors.usercategory = "Usercategory is required";
    }
    if (!name || name.length === 0) {
      newErrors.name = "Name is required";
    }
    if (!Contact || Contact.length === 0) {
      newErrors.Contact = "Contact is required";
    }
    if (!Username || Username.length === 0) {
      newErrors.Username = "Username is required";
    }
    if (!Password || Password.length === 0) {
      newErrors.Password = "Password is required";
    }
    if (selectedColonies.length === 0) { // Changed from address validation
      newErrors.colonies = "At least one colony is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateInputs()) return;
    setLoading(true);
    const apiUrl = isEditMode ? `/api/users/insert` : '/api/users/insert';
    const method = isEditMode ? 'PUT' : 'POST';

    // Convert selected colonies to comma-separated string of IDs (no spaces)
    const coloniesString = selectedColonies
      .map(id => {
        const colony = colonies.find(c => c.colony_id === id);
        return colony ? colony.colony_id : '';
      })
      .filter(Boolean)
      .join(',');

    try {
      const response = await fetch(apiUrl, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: editId,
          name: name,
          category_id: usercategory,
          username: Username,
          password: Password,
          contact_no: Contact,
          colony_id: coloniesString,
          gp_id: gp,
          status: "Active"
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast.success(editId
        ? 'updated successfully!'
        : 'Inserted successfully!');

      reset()
      setEditId(null);
      fetchData();
    } catch (error) {
      console.error('Error saving Users:', error);
      toast.error(editId
        ? 'Failed to update Users. Please try again.'
        : 'Failed to create Users. Please try again.');
    } finally {
      setLoading(false);
      setIsmodelopen(false);
    }
  };

  const handleEdit = (item: UserData) => {

    setIsActive(!isActive)
    setIsmodelopen(true);
    setIsEditmode(true);
    setUsercategory(Number(item.category_id))
    setEditId(item.user_id)
    setName(item.name)
    setContact(item.contact_no)
    setUsername(item.username)
    setPassword(item.password)
    
    // Prefer parsing IDs if present; fallback to names
    const rawIds = item.colony_id;
    if (rawIds && rawIds.length > 0) {
      const ids = rawIds
        .split(',')
        .map(s => Number(String(s).trim()))
        .filter(n => Number.isFinite(n));
      setSelectedColonies(ids);
    } else if (item.colony_names) {
      const colonyNames = item.colony_names.split(',').map(name => name.trim());
      const colonyIds = colonies
        .filter(colony => colonyNames.includes(colony.colony_name))
        .map(colony => colony.colony_id);
      setSelectedColonies(colonyIds);
    } else {
      setSelectedColonies([]);
    }
    
    // setTaluka(item.taluka_id)
    // setVillage(item.village_id)
    setgp(Number(item.gp_id))
  };
  // const handleDownloadExcel = () => {
  //   // Prepare data for Excel (remove unwanted fields if needed)
  //   const exportData = data.map(({ ...rest }) => rest); // Example: exclude password

  //   // Convert JSON to worksheet
  //   const worksheet = XLSX.utils.json_to_sheet(exportData);

  //   // Create a new workbook and append the worksheet
  //   const workbook = XLSX.utils.book_new();
  //   XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

  //   // Generate buffer
  //   const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

  //   // Save file
  //   const file = new Blob([excelBuffer], { type: "application/octet-stream" });
  //   saveAs(file, "users.xlsx");
  // };

  const columns: Column<UserData>[] = [
    {
      key: 'name',
      label: 'Name',
      accessor: 'name',
      render: (data) => <span>{data.name}</span>
    },
    {
      key: 'user_category_id',
      label: 'User Category',
      accessor: 'category_name',
      render: (data) => <span>{data.category_name}</span>
    },
    {
      key: 'username',
      label: 'User Name',
      accessor: 'username',
      render: (data) => <span>{data.username}</span>
    },
    {
      key: 'password',
      label: 'Password',
      accessor: 'password',
      render: (data) => <span>{data.password}</span>
    },
    {
      key: 'contact_no',
      label: 'Contact No',
      accessor: 'contact_no',
      render: (data) => <span>{data.contact_no}</span>
    },
    {
      key: 'colonies', // Changed from address to colonies
      label: 'Colonies',
      accessor: 'colony_names',
      render: (data) => <span>{data.colony_names}</span>
    },
    {
      key: 'status',
      label: 'Status',
      accessor: 'status',
      render: (data) => <span>{data.status}</span>
    },

    {
      key: 'actions',
      label: 'Actions',
      render: (data) => (
        <div className="flex gap-2 whitespace-nowrap w-full">
          <span
            onClick={() => handleEdit(data)}
            className="cursor-pointer text-blue-600 hover:text-blue-800 transition-colors duration-200"
          >
            <FaEdit className="inline-block align-middle text-lg" />
          </span>


          <span>
            <DefaultModal id={data.user_id} fetchData={fetchData} endpoint={"users/insert"} bodyname='user_id' newstatus={data.status} />
          </span>
        </div>
      )
    }
  ];

  return (
    <div className="">
      <div className="flex justify-end">
        {/* <button
          onClick={handleDownloadExcel}
          className="bg-green-600 text-white py-2 px-4 rounded mb-4 hover:bg-green-700 transition-colors"
        >
          Download Excel
        </button> */}
      </div>
      <ReusableTable
        data={data}
        classname={"h-[550px] overflow-y-auto scrollbar-hide"}
        inputfiled={
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-1">
            <div className="col-span-1">
              <Label>Category</Label>
              <select
                name=""
                id=""
                className={`h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 ${error.usercategory ? "border-red-500" : ""}`}
                value={usercategory}
                onChange={(e) => setUsercategory(Number(e.target.value))}
              >
                <option value="">Category</option>
                {datausercategorycrud.map((category) => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {error && (
                <div className="text-red-500 text-sm mt-1 pl-1">
                  {error.usercategory}
                </div>
              )}
            </div>
            
            <div>
              <Label>Name</Label>
              <input
                type="text"
                placeholder="Enter Name"
                className={`h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 ${error.name ? "border-red-500" : ""}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {error && (
                <div className="text-red-500 text-sm mt-1 pl-1">
                  {error.name}
                </div>
              )}
            </div>
            
            <div>
              <Label>Contact</Label>
              <input
                type="text"
                placeholder="Enter Contact"
                className={`h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 ${error.Contact ? "border-red-500" : ""}`}
                value={Contact}
                onChange={(e) => setContact(e.target.value)}
              />
              {error && (
                <div className="text-red-500 text-sm mt-1 pl-1">
                  {error.Contact}
                </div>
              )}
            </div>
            
            {/* Replace Address field with Colonies checkboxes */}
            <div>
              <Label>Colonies</Label>
              <div className="max-h-32 overflow-y-auto border rounded-lg p-3 space-y-2">
                {colonies.map((colony) => (
                  <label key={colony.colony_id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedColonies.includes(colony.colony_id)}
                      onChange={() => handleColonyChange(colony.colony_id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{colony.colony_name}</span>
                  </label>
                ))}
              </div>
              {error && (
                <div className="text-red-500 text-sm mt-1 pl-1">
                  {error.colonies}
                </div>
              )}
            </div>
            
            <div>
              <Label>Username</Label>
              <input
                type="text"
                placeholder="Enter Username"
                className={`h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 ${error.Username ? "border-red-500" : ""}`}
                value={Username}
                onChange={(e) => setUsername(e.target.value)}
              />
              {error && (
                <div className="text-red-500 text-sm mt-1 pl-1">
                  {error.Username}
                </div>
              )}
            </div>
            
            <div>
              <Label>Password</Label>
              <input
                type="text"
                placeholder="Enter Password"
                className={`h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 ${error.Password ? "border-red-500" : ""}`}
                value={Password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error && (
                <div className="text-red-500 text-sm mt-1 pl-1">
                  {error.Password}
                </div>
              )}
            </div>
          </div>
        }
        columns={columns}
        title="Users"
        filterOptions={[]}
        submitbutton={
          <button
            type='button'
            onClick={handleSave}
            className='bg-blue-700 text-white py-2 p-2 rounded'
            disabled={loading}
          >
            {loading ? 'Submitting...' : (editId ? 'Update' : 'Save Changes')}
          </button>
        }
        searchKey="username"
      />
    </div>
  );
};

export default Usersdatas;
