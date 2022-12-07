import config from "./config/app";
import cors from "cors";
import express from "express";
import Session from "express-session";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import networkRoute from "./routes/Network.route";
import userRoute from "./routes/User.route";
import authRoute from "./routes/Auth.route";
import chatRoute from "./routes/Chat.route";
import socketHandler from "./socket";
import errorHandler from "./controllers/Error.controller";
import "reflect-metadata";
import { PostgresDataSource } from "./db/connect";
import { insertDatabase } from "./helpers/ForTesting";

const app = express();
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
    //TODO: Need to be refactor
    cors: {
        origin: "*",
        credentials: false,
    },
});
//TODO: Need to consider to change limit of request
app.use(express.json({ limit: "10mb" }));
app.use(
    cors({
        origin: config.CORS_ORIGIN_WHITELIST,
        credentials: true,
    })
);

app.use(
    Session({
        name: "siwe-mycelium",
        secret: "siwe-mycelium-secret",
        resave: true,
        saveUninitialized: true,
        cookie: { secure: false, sameSite: false },
    })
);

app.use("/api/v1/auth", authRoute);
app.use("/api/v1/user", userRoute);
app.use("/api/v1/networks", networkRoute);
app.use("/api/v1/chat", chatRoute);
app.use("*", errorHandler);

const usersOnlineInNetwork: UsersOnlineInEachNetwork = {};
io.on("connection", (socket) => {
    socketHandler(socket, usersOnlineInNetwork);
});

const initializeServer = async () => {
    try {
        await PostgresDataSource.initialize();

        //! Just for testing purpose
        // const beforeStart = async () => {
        // 	await insertDatabase();
        // };
        // beforeStart();

        httpServer.listen(config.PORT, () => {
            console.log(`Server started on port ${config.PORT}`);
        });
    } catch (err) {
        console.log(`Server failed to start: ${err}`);
    }
};

initializeServer();

export { httpServer, io };
