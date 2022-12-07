import { HttpStatusCode } from '../data/enum/HttpStatusCode';
import express from 'express';
import { MissingFieldsError, NotFoundError } from '../utils/AppError';
import { UserRepo } from '../models/Repo';

export const getUserProfile = async (
	req: express.Request,
	res: express.Response,
) => {
	const user = await UserRepo.findOne({
		where: { id: req.user.id },
	});
	if (!user) {
		throw new NotFoundError('User not found');
	}
	res.status(HttpStatusCode.SUCCESS).json(user);
};

export const modifyUserProfile = async (
	req: express.Request,
	res: express.Response,
) => {
	if (!req.body.name && !req.body.avatar) {
		throw new MissingFieldsError('Expected name or avatar in request body');
	}
	const existedUser = await UserRepo.findOne({
		where: { address: req.body.address },
	});
	if (!existedUser) {
		throw new NotFoundError('User not found');
	}

	//TODO: need to throw error if client change name within 24h
	const nameCanChanged =
		!existedUser.dateUpdatedOfName ||
		existedUser.dateUpdatedOfName.getTime() <
		new Date().getTime() - 24 * 60 * 60 * 1000;
	if (nameCanChanged) {
		existedUser.name = req.body.name;
		existedUser.dateUpdatedOfName = new Date();
	}

	existedUser.avatar = req.body.avatar;
	const updatedUser = await UserRepo.save(existedUser);
	res.status(HttpStatusCode.SUCCESS).json(updatedUser);
};
