import dotenv from 'dotenv';

dotenv.config();

const config = {
	PORT: process.env.PORT,
	CORS_ORIGIN_WHITELIST: process.env.CORS_ORIGIN_WHITELIST
		? process.env.CORS_ORIGIN_WHITELIST.split(' ')
		: [],
	DB_HOST: process.env.POSTGRES_HOST!,
	DB_PORT: +process.env.POSTGRES_PORT! || 5432,
	DB_NAME: process.env.POSTGRES_DB!,
	DB_USER: process.env.POSTGRES_USER!,
	DB_PASSWORD: process.env.POSTGRES_PASSWORD!,
};

export default config;
