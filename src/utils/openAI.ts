import { Client, Message, User } from "discord.js";
import OpenAI from "openai";
import { ChatCompletionContentPart, ChatCompletionCreateParams, ChatCompletionMessage, ChatCompletionMessageParam } from "openai/resources";
import { logger } from "../logger";

import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { ParsedChatCompletion } from "openai/resources/beta/chat/completions";

export const openAI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const Step = z.object({
    content: z.string(),
})

const Reasoning = z.object({
    steps: z.array(Step),
    conclusion: z.string(),
})

const ShouldReply = z.object({
    shouldReply: z.boolean(),
})

export class GuildAI {
    private messages: [[string, string], string][] = [];

    constructor(
        public client: Client,
        public guildId: string,
        public openAI: OpenAI,

        // The maximum number of messages to store in the AI's memory
        public MaxMessages: number = 150,
        public replyPrompt: string = this.generateReplyPrompt(client),
        public shouldReplyPrompt: string = this.generateShouldReplyPrompt(client),
    ) {
        this.guildId = guildId;
        this.openAI = openAI;
    }

    private generateShouldReplyPrompt(client: Client): string {
        const botDisplayname = client.user?.displayName;
        const botId = client.user?.id;

        return `
        You are a Discord bot named ${botDisplayname}, with the ID ${botId}.
        To mention users, use the format <@USER_ID>.

        - Think through each task step by step.
        - Only respond to messages that mention you using <@${botId}> or are explicitly directed to you, unless the message is a question.
        - If a message is not directed at you or does not mention <@${botId}>, dont respond.
        - If you're unsure of the answer, don't respond.
        `;
    }

    private generateReplyPrompt(client: Client): string {
        const botDisplayname = client.user?.displayName;
        const botId = client.user?.id;

        return `
        You are a Discord bot named ${botDisplayname}, with the ID ${botId}.
        To mention users, use the format <@USER_ID>.

        - Think through each task step by step.
        - Respond with short, clear, and concise replies.
        - Do not include your name or ID in any of your responses.
        `;
    }

    private get messagesParts(): ChatCompletionMessageParam[] {
        return this.messages.map<ChatCompletionMessageParam>(([author, msg]) => ({
            role: msg[1] !== this.client.user?.id ? "user" : "assistant",
            content: `[${author[0]}, ${author[1]}]: ${msg}`,
        }));
    }

    private async shouldReply(message: Message): Promise<boolean> {
        const response = await this.openAI.beta.chat.completions.parse({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: this.shouldReplyPrompt },
                ...this.messagesParts,
                { role: "user", content: message.content },
            ],
            response_format: zodResponseFormat(ShouldReply, "shouldReply"),
            max_tokens: 500,
        });

        return response.choices[0]?.message?.parsed?.shouldReply ?? false;
    }

    private async generateResponse(message: Message) {
        this.addMessage(message.author, message.content);
        const reply = await this.shouldReply(message);
        if (reply) {
            message.channel.sendTyping();
            const typeingIndicator = setInterval(() => message.channel.sendTyping(), 1000);
    
            const imageUrlsParts = message.attachments
                .filter(attachment => attachment.contentType?.startsWith("image"))
                .map<ChatCompletionContentPart>(url => ({
                    type: "image_url",
                    image_url: { "url": url.url },
                }));
    
            const response = await this.openAI.beta.chat.completions.parse({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: this.replyPrompt },
                    ...this.messagesParts,
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: `[User: ${message.author.displayName}, ID: ${message.author.id}] Message: ${message.content}`,
                            },                        
                            ...imageUrlsParts,
                        ]
                    },
                ],
                response_format: zodResponseFormat(Reasoning, "reasoning"),
                max_tokens: 500,
            });
    
            if (!response.choices[0]?.message?.refusal && response.choices[0]?.message?.parsed?.conclusion) {
                this.addMessage(this.client.user!, response.choices[0].message.parsed?.conclusion);
            }
    
            clearInterval(typeingIndicator);
            return response.choices[0]?.message;
        }
    }

    private addMessage(user: User, message: string): void {
        this.messages.push([[user.displayName, user.id], message]);

        if (this.messages.length > this.MaxMessages) {
            this.messages.shift();
        }
    }

    public async onUserMessage(message: Message): Promise<void> {
        logger.info(`Received message from ${message.author.displayName} in guild ${message.guild?.name}`);
        const response = await this.generateResponse(message);
        logger.info(`Generated response: ${response?.content}`);
        if (response && !response.refusal && response.parsed?.conclusion && response.parsed.conclusion !== "refuse") {
            message.reply(response.parsed.conclusion);
        }
    }
}
