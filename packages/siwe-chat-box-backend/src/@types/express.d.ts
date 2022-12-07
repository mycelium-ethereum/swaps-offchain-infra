declare global {
    namespace Express {
        interface Request {
            user: {
                id: number;
                address: string;
            };
        }
    }
}

export {};
