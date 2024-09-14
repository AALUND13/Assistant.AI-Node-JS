import path from 'path';
import fs from 'fs';
import { ChatInputCommandInteraction, REST, Routes } from 'discord.js';
import { CustomClient } from '../types';
import { logger } from '../logger';

export let disableCooldownd = false;

export function setDisableCooldown(value: boolean): void {
    disableCooldownd = value;
}

export interface CommandOptions {
    botPermissions: bigint;

    cooldown: number;

    devOnly: boolean;
    DevGuildOnly: boolean;
}

export interface Command {
    data: any;
    commandOptions: CommandOptions;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

const folderPath = path.join(__dirname, '../commands');
const commandFolders = fs.readdirSync(folderPath);

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN!);

function loadCoommands(): Command[] {
    const commands: Command[] = [];

    for (const folder of commandFolders) {
        const commandsPath = path.join(folderPath, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command: Command = require(filePath).default || require(filePath);

            if ('data' in command && 'execute' in command) {
                commands.push(command);
                logger.info(`Loaded command: ${command.data.name}`);
            } else {
                logger.warn(`The command at path ${filePath} is missing a required 'data' or 'execute' property`);
            }
        }
    }

    return commands;
}

export async function registerCommands(client: CustomClient): Promise<void> {
    const commands = loadCoommands();

    try {
        logger.info('Started registering new global application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID!),
            { body: commands.filter(command => !command?.commandOptions?.DevGuildOnly).map(command => command.data) }
        );

        logger.info('Successfully registered global application (/) commands.');

        logger.info('Started registering new guild application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.DEV_GUILD!),
            { body: commands.filter(command => command?.commandOptions?.DevGuildOnly).map(command => command.data) }    
        );

        logger.info('Successfully registered guild application (/) commands.');
        client.commands.clear();
        if (disableCooldownd) {
            commands.forEach(command => command.commandOptions.cooldown = 0);
        }
        commands.forEach(command => client.commands.set(command.data.name, command));
    } catch (error) {
        logger.error(error);
    }
}