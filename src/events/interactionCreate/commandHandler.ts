import { ChatInputCommandInteraction, Events, Interaction } from "discord.js";
import { CustomClient } from "../../types";
import { logger } from "../../logger";
import { db, GetOrCreateUserData as getOrCreateUserData } from "../../db";

const devs = process.env.DEVS!.split(',');

export async function execute(interaction: Interaction) {
    if (!interaction.isCommand()) return;

    const command = (interaction.client as CustomClient).commands.get(interaction.commandName);
    if (!command) {
        logger.error(`Command ${interaction.commandName} not found.`);
        return;
    }

    const userId = interaction.user.id;
    const data = getOrCreateUserData(userId);

    try {
        if (command.commandOptions?.devOnly && !devs.includes(userId)) {
            logger.warn(`User ${interaction.user.displayName}(${interaction.user.id}) tried to execute a dev-only command.`);
            return await interaction.reply({ content: 'This command is only available for developers.', ephemeral: true });
        }

        const cooldownEnd = data.commandCooldowns[command.data.name] ?? 0;
        if (cooldownEnd > Date.now()) {
            logger.warn(`User ${interaction.user.displayName}(${interaction.user.id}) tried to execute command ${interaction.commandName} while on cooldown.`);
            return await interaction.reply({ content: `You're on cooldown for this command. Please try again in <t:${Math.floor(cooldownEnd / 1000)}:R>.`, ephemeral: true });
        }

        logger.info(`User ${interaction.user.displayName}(${interaction.user.id}) executed command: ${interaction.commandName}`);
        await command.execute(interaction as ChatInputCommandInteraction);

        if (command.commandOptions?.cooldown) {
            data.commandCooldowns[command.data.name] = Date.now() + command.commandOptions.cooldown;
            db.get('UserData')[userId] = data;
            db.write();
        }
    } catch (error) {
        logger.error(`Error executing command ${interaction.commandName}:`, error);
        const replyContent = 'There was an error while executing this command!';

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: replyContent, ephemeral: true });
        } else {
            await interaction.reply({ content: replyContent, ephemeral: true });
        }
    }
}
