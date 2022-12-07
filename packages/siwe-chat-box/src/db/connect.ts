import config from '../config/app';
import { DataSource } from 'typeorm';
import Message from '../models/Message.model';
import Chatbox from '../models/Chatbox.model';
import User from '../models/User.model';

export const PostgresDataSource = new DataSource({
	type: 'postgres',
	host: config.DB_HOST,
	port: config.DB_PORT,
	username: config.DB_USER,
	password: config.DB_PASSWORD,
	database: config.DB_NAME,
	synchronize: true,
	logging: false,
	entities: [Message, Chatbox, User],
	migrations: [],
	subscribers: [],
});
