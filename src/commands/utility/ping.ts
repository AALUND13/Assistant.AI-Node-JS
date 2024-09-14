import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Get the bot\'s ping.');

export async function execute(interaction: ChatInputCommandInteraction) {
    interaction.reply({ content: `Pong! ${interaction.client.ws.ping}ms`, ephemeral: true });
}

export const commandOptions = {
    cooldown: 5000
}