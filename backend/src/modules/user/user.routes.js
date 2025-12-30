import { Router } from 'express';
import { getUserById } from './user.controller';
const router = Router();
router.get('/:id', getUserById);
export default router;
//# sourceMappingURL=user.routes.js.map