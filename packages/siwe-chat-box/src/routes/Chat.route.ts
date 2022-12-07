import { authenticatedGuard } from '../middleware/Siwe.middleware';
import {
	getListMsgByNetworkId,
	sendMessageToAllClientsWithNetworkId,
} from '../controllers/Chat.controller';
import { Router } from 'express';
import asyncHandler from '../utils/AsyncHandler';

const chatRoute = Router();
chatRoute.get('/messages', asyncHandler(getListMsgByNetworkId));
chatRoute.post(
	'/messages',
	authenticatedGuard,
	asyncHandler(sendMessageToAllClientsWithNetworkId),
);

export default chatRoute;
