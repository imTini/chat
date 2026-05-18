import { type User } from "../../db/schema.js";
export declare function hashPassword(password: string): Promise<string>;
export declare function verifyPassword(password: string, hash: string): Promise<boolean>;
export declare function findUserByUsername(username: string): Promise<User | null>;
export declare function createUserSession(userId: string): Promise<string>;
export declare function validateSession(token: string): Promise<User | null>;
export declare function deleteUserSession(token: string): Promise<void>;
export declare function incrementTokenCount(userId: string, tokens: number): Promise<void>;
