import { Injectable, Post } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service.js";

@Injectable()
export class UserService {
  constructor( private readonly prisma: PrismaService) {}


}
