import { Client, Collection } from 'discord.js';
import { Command } from './managers/commandManager';

export interface CustomClient extends Client {
    commands: Collection<string, Command>;
}

export type GuildData = {
    lastMessages: string[];
}

export type UserData = {
    commandCooldowns: {
        [key: string]: number;
    }
}

export type Data = {
    UserData: {
        [key: string]: UserData;
    },
    GuildData: {
        [key: string]: GuildData;
    }
}