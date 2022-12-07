import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	ManyToOne,
} from 'typeorm';
import Chatbox from './Chatbox.model';
import User from './User.model';

@Entity()
class Message {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	chatboxId: number;

	@Column()
	senderId: number;

	//* This is anonym name of sender, they can change it within 24 hours
	//* Example: At 12:00, user A send a message,
	//* then user A change their name to "B",
	//* then the user send another message,
	//* the name of the second message will be "B",
	//* the name of the previous message will be "A"
	@Column()
	currentUsername: string;

	@Column({ nullable: true })
	currentAvatar: string;

	//* content message
	@Column()
	content: string;

	//* type 0: common message
	//* type 1: [name] opened a long on [asset]
	//* type 2: [name] opened a short on [asset]
	//* type 3: [name] closed a long on [asset]
	//* type 4: [name] closed a short on [asset]
	//* type 5: [name] swapped [asset in] → [asset out]
	@Column()
	messageType: number;

	@Column()
	@CreateDateColumn({ type: 'timestamptz' })
	timestamp: Date;

	@ManyToOne(() => Chatbox)
	chatbox: Chatbox;

	@ManyToOne(() => User)
	sender: User;
}

export default Message;
