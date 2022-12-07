import {
	setNonceSession,
	getPersonalInfo,
	verifyMsgWithNonceSession,
} from '../controllers/Auth.controller';
import { Router } from 'express';
const authRoute = Router();
authRoute.get('/nonce', setNonceSession);
authRoute.post('/verify', verifyMsgWithNonceSession);
authRoute.get('/personal_information', getPersonalInfo);

export default authRoute;
