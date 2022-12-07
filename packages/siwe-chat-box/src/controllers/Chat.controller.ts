import { io } from '../main';
import express from 'express';
import { ChatboxRepo, MessageRepo } from '../models/Repo';
import { HttpStatusCode } from '../data/enum/HttpStatusCode';
import { MissingFieldsError, NotFoundError } from '../utils/AppError';

export const getListMsgByNetworkId = async (
	req: express.Request,
	res: express.Response,
) => {
	//* Default networkId is 1
	const networkId = req?.query?.networkId || '1';
	const chatbox = await ChatboxRepo.findOne({
		where: { network: networkId.toString() },
	});
	const messages = await MessageRepo.find({
		where: { chatboxId: chatbox?.id || 0 },
		order: {
			id: "ASC",
		},
	});
	res.status(HttpStatusCode.SUCCESS).json(messages || []);
};

export const sendMessageToAllClientsWithNetworkId = async function (
	req: express.Request,
	res: express.Response,
) {
	if (!req.body.content || !req.body.networkId) {
		throw new MissingFieldsError(
			'Expected content and networkId in request body',
		);
	}
	const existedChatbox = await ChatboxRepo.findOne({
		where: { network: req.body.networkId },
	});
	if (!existedChatbox) {
		throw new NotFoundError('Chatbox not found');
	}

	const createdMsg = await MessageRepo.save({
		senderId: req.user.id,
		content: req.body.content,
		chatboxId: existedChatbox.id,
		messageType: req.body.messageType,
		currentUsername: req.body.currentUsername,
		currentAvatar: req.body.currentAvatar,
	});
	//* Send message to all connected clients
	io.in(`chatbox-${req.body.networkId}`).emit('message', createdMsg);

	res.status(HttpStatusCode.SUCCESS).json(createdMsg);
};
