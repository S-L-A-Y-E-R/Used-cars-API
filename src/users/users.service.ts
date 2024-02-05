import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import cloudinaryV2 from 'src/utils/cloudinary.config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as streamifier from 'streamifier';
import { User } from './users.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async changeProfilePhoto(
    file: Express.Multer.File,
    user: User,
  ): Promise<User> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinaryV2.uploader.upload_stream(
        { resource_type: 'image' },
        (error, result) => {
          if (error) {
            reject(
              new BadRequestException(
                `Failed to upload file to Cloudinary: ${error.message}`,
              ),
            );
            return;
          }
          user.photo = result.secure_url;
          this.usersRepository.save(user).then((updatedUser) => {
            resolve(updatedUser);
          });
        },
      );
      const bufferStream = streamifier.createReadStream(file.buffer);
      bufferStream.pipe(uploadStream);
    });
  }

  findOne(id: number) {
    return this.usersRepository.findOneBy({ id });
  }

  find() {
    return this.usersRepository.find();
  }

  async update(id: number, attrs: Partial<User>) {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    Object.assign(user, attrs);
    return this.usersRepository.save(user);
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.usersRepository.remove(user);
  }
}
