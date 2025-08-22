export interface Voterdatatye {
    colony_id : number;
    colony_name: string;
    first_name : string;
    middle_name: string;
    last_name: string;
    full_name: string;
    booth_number: string;
    status: string;


}
export interface colonyentrydatatype {
    colony_entry_id  : number;
    colony_id: string;
    house_number : string;
    user_id: string;
    status: string;
  


}
export interface voterdayatype {
    voter_id   : number;
    colony_entry_id: string;
    first_name : string;
    middle_name: string;
    last_name: string;
    full_name: string;
    voter_number: string;
    gender: string;
    relation: string;
    dob: string;
    aadhaar_number: string;
    booth_number: string;
    photo: string;
    mobile: string;
    user_id: string;
    status: string;
    // last_name: string;
  


}
