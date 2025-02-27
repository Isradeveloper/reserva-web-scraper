import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { Repository } from "typeorm";
import { User } from "./entities/user.entity";
import { InjectRepository } from "@nestjs/typeorm";
import * as Bcrypt from "bcrypt";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    try {
      const usuario = this.userRepository.create({
        ...createUserDto,
      });

      return await this.userRepository.save(usuario);
    } catch (error) {
      throw new Error(error);
    }
  }

  async findAll() {
    const users = await this.userRepository.find();
    return users;
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) throw new NotFoundException("User not found with this id");

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.preload({
      id,
      ...updateUserDto,
    });

    if (!user) throw new NotFoundException("User not found with this id");

    return await this.userRepository.save(user);
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    await this.userRepository.remove(product);
    return { message: "User deleted successfully" };
  }
}
