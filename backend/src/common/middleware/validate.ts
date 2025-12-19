import type { Request, Response, NextFunction } from 'express';
import { z, type ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.issues?.map(e => ({
            path: e.path?.join('.') || 'unknown',
            message: e.message
          })) || [],
        });
      }
      return res.status(500).json({ 
        success: false, 
        error: 'Internal server error',
        message: error?.message || 'Unknown error'
      });
    }
  };