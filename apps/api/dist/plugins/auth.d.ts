import type { FastifyInstance } from "fastify";
import type { User } from "../db/schema.js";
declare module "fastify" {
    interface FastifyRequest {
        user: User | null;
    }
}
export declare const authPlugin: (app: FastifyInstance) => Promise<void>;
