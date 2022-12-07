import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @Index({ unique: true })
    address: string;

    @Column({ nullable: true })
    name?: string;

    @Column({ nullable: true })
    dateUpdatedOfName?: Date;

    @Column({ nullable: true })
    avatar?: string;

    @Column()
    @CreateDateColumn({ type: "timestamptz" })
    createdAt: Date;

    @Column()
    @UpdateDateColumn({ type: "timestamptz" })
    updatedAt: Date;
}

export default User;
