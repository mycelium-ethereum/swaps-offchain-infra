import { Router } from 'express';
import asyncHandler from '../utils/AsyncHandler';
import {
	generateNewNetwork,
	getListNetworks,
} from '../controllers/Network.controller';

const networkRoute = Router();
networkRoute.post('/', asyncHandler(generateNewNetwork));

networkRoute.get('/', asyncHandler(getListNetworks));
export default networkRoute;
