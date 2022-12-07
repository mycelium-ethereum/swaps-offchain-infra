import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
class Chatbox {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @Index({ unique: true })
    network: string;

    @Column()
    @CreateDateColumn({ type: "timestamptz" })
    createdAt: Date;

    @Column()
    @UpdateDateColumn({ type: "timestamptz" })
    updatedAt: Date;
}

export default Chatbox;
