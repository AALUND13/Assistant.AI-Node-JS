import 'dotenv/config';

import { Client, Collection, IntentsBitField } from 'discord.js';
import { CustomClient } from './types';
import { registerCommands, setDisableCooldown } from './managers/commandManager';
import { registerEvents } from './managers/eventManager';
import { logger } from './logger';

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent
    ]
}) as CustomClient;

client.commands = new Collection();

process.argv.forEach(arg => {
    if (arg === '--dev') {
        logger.info('Bot is running in development mode, disabling cooldowns');
        setDisableCooldown(true);
    }
})

registerEvents(client);
registerCommands(client);

client.login(process.env.TOKEN);
