import { PostgresDataSource } from "../db/connect";
import Chatbox from "./Chatbox.model";
import Message from "./Message.model";
import User from "./User.model";

export const MessageRepo = PostgresDataSource.getRepository(Message);
export const ChatboxRepo = PostgresDataSource.getRepository(Chatbox);
export const UserRepo = PostgresDataSource.getRepository(User);
