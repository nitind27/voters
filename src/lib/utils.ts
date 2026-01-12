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
 * Get the text color class for Voter ID based on installment payment status
 * Priority: inst_3_paid > inst_2_paid > inst_1_paid
 * @param inst_1_paid - First installment payment status (string, number, or null)
 * @param inst_2_paid - Second installment payment status (string, number, or null)
 * @param inst_3_paid - Third installment payment status (string, number, or null)
 * @returns Tailwind CSS text color class
 */
export const getVoterIdColorClass = (
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

    // Priority: inst_3_paid > inst_2_paid > inst_1_paid
    if (isPaid(inst_3_paid)) {
        return 'text-green-600'; // Green for inst_3_paid
    }
    if (isPaid(inst_2_paid)) {
        return 'text-blue-600'; // Blue for inst_2_paid
    }
    if (isPaid(inst_1_paid)) {
        return 'text-orange-600'; // Orange for inst_1_paid
    }
    
    // Default color if no installment is paid
    return 'text-black'; // Default black color
};