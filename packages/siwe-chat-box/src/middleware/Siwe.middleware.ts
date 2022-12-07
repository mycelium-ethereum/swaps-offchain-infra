import { RequestHandler } from 'express';
import { UserRepo } from '../models/Repo';
import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';

export const authenticatedGuard: RequestHandler = async (req, res, next) => {
	if (!req.session.siwe) {
		res.status(401).json({ message: 'You have to first sign_in' });
		return;
	}
	const existedUser = await UserRepo.findOne({
		where: { address: req.session.siwe.address },
	});

	if (!existedUser) {
		res.status(401).json({ message: 'You have to first sign_in' });
		return;
	}

	req.user = {
		id: existedUser.id,
		address: existedUser.address,
	};

	next();
};

export const socketAuthenticatedGuard = (
	socket: Socket,
	next: (err?: ExtendedError) => void,
) => {
	if (!socket.handshake.auth.siwe) {
		next(new Error('You have to first sign_in'));
		return;
	}

	next();
};
