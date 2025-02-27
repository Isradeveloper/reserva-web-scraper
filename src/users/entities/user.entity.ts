import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("text")
  name: string;

  @Column("text", { unique: true })
  email: string;

  @Column("text", { nullable: true })
  emailNotification: string;

  @Column("text", { select: false })
  password: string;

  @Column("text", { unique: true })
  cedula: string;

  @BeforeInsert()
  @BeforeUpdate()
  parseColumns() {
    this.cedula = this.cedula.trim();
    this.email = this.email.trim().toLowerCase();
    this.name = this.name.trim().toUpperCase();
  }
}
