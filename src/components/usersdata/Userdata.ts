export interface UserData {
  user_id:number;
  category_id:number;
  name: string;
  user_category_id: number;
  username: string;
  password: string;
  
  colonies: string; // Changed from address to colonies
  taluka_id: number;
  taluka_name: string;
  contact_no: string;
  village_id: number;
  village_name: string;
  user_category_name: string;
  gp_id: string;
  status: string;
  colony_names: string;
  category_name: string;
  colony_id?: string; // add: comma-separated ids ("1,2,3")
}
  
