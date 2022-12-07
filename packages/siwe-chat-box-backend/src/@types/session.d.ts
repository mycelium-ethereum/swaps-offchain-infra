import { SiweMessage } from "siwe";

declare module "express-session" {
    interface Session {
        nonce: string | null;
        siwe: SiweMessage | null;
    }
}
