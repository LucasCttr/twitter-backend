import { Injectable, Post } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";

@Injectable()
export class UserService {
  constructor( private readonly prisma: PrismaService) {}


}
