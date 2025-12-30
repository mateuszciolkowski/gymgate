import { z } from 'zod';
export const validate = (schema) => async (req, res, next) => {
    try {
        await schema.parseAsync({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        return next();
    }
    catch (error) {
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
//# sourceMappingURL=validate.js.map