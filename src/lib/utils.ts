// import { signOut } from "../../auth";

// export async function logout() {
//     const res = await signOut();
//     return res;
//   }

export const formatDate = (dateString: string): string => {
    // Create a Date object from the input string
    const date = new Date(dateString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
        // If the date is invalid, return a fallback string or handle as needed
        return "Invalid Date"; // or return an empty string, etc.
    }
    
    const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    };
  
    // Return the formatted date as a string
    return date.toLocaleDateString('en-IN', options);
};

/**
 * Get the background color class for table row based on installment payment status
 * Priority: inst_3_paid > inst_2_paid > inst_1_paid
 * @param inst_1_paid - First installment payment status (string, number, or null)
 * @param inst_2_paid - Second installment payment status (string, number, or null)
 * @param inst_3_paid - Third installment payment status (string, number, or null)
 * @returns Tailwind CSS background color class
 */
export const getVoterRowBgClass = (
    inst_1_paid: string | number | null | undefined,
    inst_2_paid: string | number | null | undefined,
    inst_3_paid: string | number | null | undefined
): string => {
    // Helper to check if installment is paid (value is '1' or 1)
    const isPaid = (value: string | number | null | undefined): boolean => {
        if (value === null || value === undefined) return false;
        if (typeof value === 'boolean') return value === true;
        const str = String(value).trim();
        return str === '1' || str === 'true' || str === 'True' || value === 1;
    };

    // If any installment is paid, return light green background
    if (isPaid(inst_1_paid) || isPaid(inst_2_paid) || isPaid(inst_3_paid)) {
        return 'bg-green-50'; // Light green background for any paid installment
    }
    
    // Default: no background color
    return '';
};