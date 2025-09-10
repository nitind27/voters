export interface Colony {
    colony_id: number;
    colony_name: string;
    status: string;
    created_at: string;
    updated_at: string;
}

export interface ColonyFormData {
    colony_name: string;
    status?: string;
}

export interface ColonyResponse {
    message: string;
    colony_id?: number;
}