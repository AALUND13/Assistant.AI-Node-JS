import path from 'path';
import fs from 'fs';
import { logger } from '../logger';
import { CustomClient } from '../types';

export function registerEvents(client: CustomClient): void {
    const eventsPath = path.join(__dirname, '../events');
    const eventFolders = fs.readdirSync(eventsPath);

    for (const folder of eventFolders) {
        logger.info(`Searching for events in folder: ${folder}`);
        const eventHandlers: Function[] = [];

        const eventPath = path.join(eventsPath, folder);
        const eventFiles = fs.readdirSync(eventPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

        for (const file of eventFiles) {
            const filePath = path.join(eventPath, file);
            try {
                const eventModule = require(filePath).default || require(filePath);

                if (typeof eventModule.execute === 'function') {
                    eventHandlers.push(eventModule.execute);
                    logger.info(`Successfully loaded event: ${file} from folder: ${folder}`);
                } else {
                    logger.warn(`Skipped ${file} in folder: ${folder} - No valid 'execute' function found.`);
                }
            } catch (error) {
                logger.error(`Error loading event: ${file} in folder: ${folder} - ${(error as Error).message}`);
            }
        }

        if (eventHandlers.length > 0) {
            client.on(folder, (...args) => {
                eventHandlers.forEach(handler => handler(...args, client));
            });
            logger.info(`Registered ${eventHandlers.length} handlers for event: ${folder}`);
        } else {
            logger.warn(`No valid handlers found for event: ${folder}. Skipping registration.`);
        }
    }
}
