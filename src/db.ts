import { Data, UserData } from "./types";
import Database from "./utils/Database";

const DefaultData: Data = {
    UserData: {},
    GuildData: {}
}

export const db = new Database<Data>('data.json', DefaultData);

export function GetOrCreateUserData(userId: string): UserData {
    return db.data.UserData[userId] ?? { commandCooldowns: {} };
}