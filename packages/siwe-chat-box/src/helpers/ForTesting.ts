import { ChatboxRepo, MessageRepo, UserRepo } from '../models/Repo';

export const insertDatabase = async () => {
	//* add new user
	const user = await UserRepo.save({
		name: 'John Doe',
		address: 'address-1',
		dateUpdatedOfName: new Date(),
		avatar: 'avatar-1',
	});

	//* create new chatbox (room by network)
	const chatbox = await ChatboxRepo.save({
		network: 'network-1',
	});

	//* add new message
	const message = await MessageRepo.save({
		senderId: user.id,
		content: 'message-1',
		chatboxId: chatbox.id,
		messageType: 0,
	});
};
