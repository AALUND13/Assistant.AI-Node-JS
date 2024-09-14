import { Client, Message } from "discord.js";
import { logger } from "../../logger";
import { GuildAI, openAI } from "../../utils/openAI";

const GuildChatAI = new Map<string, GuildAI>();

export function execute(message: Message, client: Client): void {
    if (message.author.bot) return;
    if (!message.guild) return;

    if (!GuildChatAI.has(message.guild.id)) {
        GuildChatAI.set(message.guild.id, new GuildAI(client, message.guild.id, openAI));
    }

    const ai = GuildChatAI.get(message.guild.id);
    ai?.onUserMessage(message);
}