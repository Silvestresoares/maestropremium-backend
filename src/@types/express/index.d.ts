declare namespace Express {
  export interface Request {
    user: {
      id: string | number;
      organization_id?: string;
      role?: string;
    };
  }
}