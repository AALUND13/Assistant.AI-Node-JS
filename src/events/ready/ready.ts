import { Events, type Client } from 'discord.js';
import { logger } from '../../logger';

export function execute(client: Client) {
  logger.info(`${client.user!.tag} is online!`);
}