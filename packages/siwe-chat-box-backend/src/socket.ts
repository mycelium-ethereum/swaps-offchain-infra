import { ChatboxRepo } from "./models/Repo";
import { Socket } from "socket.io";

const socketHandler = (socket: Socket, usersOnlineInNetwork: UsersOnlineInEachNetwork) => {
    socket.on("join-chatbox", async ({ network }: JoinChatBoxBody) => {
        const existChatbox = await ChatboxRepo.findOne({ where: { network } });
        if (!existChatbox) {
            socket.emit("error", {
                message: "Chatbox not found. Please create chatbox first.",
            });
            return;
        }
        socket.join(`chatbox-${network}`);

        socket.emit("joined-chatbox", existChatbox);

        if (!usersOnlineInNetwork[network]) {
            usersOnlineInNetwork[network] = [];
        }
        usersOnlineInNetwork[network].push(socket.id);
        socket.to(`chatbox-${network}`).emit("users-online", usersOnlineInNetwork[network]);
    });

    socket.on("leave-chatbox", ({ network }: JoinChatBoxBody) => {
        socket.leave(`chatbox-${network}`);
        if (usersOnlineInNetwork[network]) {
            usersOnlineInNetwork[network] = usersOnlineInNetwork[network].filter((socketId) => socketId !== socket.id);
        }
        socket.to(`chatbox-${network}`).emit("users-online", usersOnlineInNetwork[network]);
    });

    socket.on("disconnect", () => {
        Object.keys(usersOnlineInNetwork).forEach((network) => {
            usersOnlineInNetwork[network] = usersOnlineInNetwork[network].filter((socketId) => socketId !== socket.id);
            socket.to(`chatbox-${network}`).emit("users-online", usersOnlineInNetwork[network]);
        });

        console.log("disconnect");
    });
};

export default socketHandler;
