import 'express';

declare module 'express' {
  export interface Request {
    user?: {
      id: string;
      organization_id: string;
      role: string;
      is_super_admin: boolean;
    };
  }
}