import { Message } from "discord.js";
import OpenAI from "openai";
import { ChatCompletionAssistantMessageParam, ChatCompletionContentPart, ChatCompletionMessageParam, ChatCompletionUserMessageParam, ChatModel } from "openai/resources";
import { logger } from "../../logger";

import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { client } from "../../client";

export const openAI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Define the schema for the response from the OpenAI API
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

/**
* GuildAI class
* 
* This class is used to manage the AI for a specific guild.
* It handles the logic for generating responses to user messages.
*/
export class GuildAI {
    private messages: ChatCompletionMessageParam[] = [];
    private client = client;

    constructor(
        public guildId: string,
        public openAI: OpenAI,

        public model: ChatModel = "gpt-4o-mini",
        public maxTokens: number = 500,

        public MaxMessages: number = 50, // The maximum number of messages to store in the AI's memory
        public replyPrompt: string = this.DefaultReplyPrompt,
        public shouldReplyPrompt: string = this.DefaultShouldReplyPrompt,
    ) {
        this.guildId = guildId;
        this.openAI = openAI;

        this.replyPrompt = replyPrompt || this.DefaultReplyPrompt;
        this.shouldReplyPrompt = shouldReplyPrompt || this.DefaultShouldReplyPrompt
    }

    public get DefaultShouldReplyPrompt(): string {
        const botDisplayname = this.client.user?.displayName;
        const botId = this.client.user?.id;

        return `
        You are a Discord bot named ${botDisplayname}, with the ID ${botId}.
        To mention users, use the format <@USER_ID>.

        - Think through each task step by step.
        - Only respond to messages that mention you using <@${botId}> or are explicitly directed to you, unless the message is a question.
        - If a message is not directed at you or does not mention <@${botId}>, dont respond.
        - If you're unsure of the answer, don't respond.
        `;
    }

    public get DefaultReplyPrompt(): string {
        const botDisplayname = this.client.user?.displayName;
        const botId = this.client.user?.id;

        return `
        You are a Discord bot named ${botDisplayname}, with the ID ${botId}.
        To mention users, use the format <@USER_ID>.

        - Think through each task step by step.
        - Respond with short, clear, and concise replies.
        - Do not include your name or ID in any of your responses.
        `;
    }

    private async shouldReply(message: Message): Promise<boolean> {
        const response = await this.openAI.beta.chat.completions.parse({
            model: this.model,
            messages: [
                { role: "system", content: this.shouldReplyPrompt },
                ...this.messages,
                await this.generateChatCompletionMessageParam(message),
            ],
            response_format: zodResponseFormat(ShouldReply, "shouldReply"),
            max_tokens: this.maxTokens,
        });

        return response.choices[0]?.message?.parsed?.shouldReply ?? false;
    }

    private async generateResponse(message: Message) {
        this.addMessage(message)
        const reply = await this.shouldReply(message);
        if (reply) {
            message.channel.sendTyping();
            const typeingIndicator = setInterval(() => message.channel.sendTyping(), 1000);
    

            const response = await this.openAI.beta.chat.completions.parse({
                model: this.model,
                messages: [
                    { role: "system", content: this.replyPrompt },
                    ...this.messages,
                ],
                response_format: zodResponseFormat(Reasoning, "reasoning"),
                max_tokens: this.maxTokens,
            });
    
            if (!response.choices[0]?.message?.refusal && response.choices[0]?.message?.parsed?.conclusion) {
                this.addMessage({ role: "assistant", content: response.choices[0]?.message?.parsed?.conclusion });
            }
    
            clearInterval(typeingIndicator);
            return response.choices[0]?.message;
        }
    }

    private async generateChatCompletionMessageParam(message: Message): Promise<ChatCompletionMessageParam> {
        const role = message.author.id === this.client.user?.id ? "assistant" : "user";
        const imageUrlsParts = message.attachments
            .filter(attachment => attachment.contentType?.startsWith("image"))
            .map<ChatCompletionContentPart>(attachment => ({
                type: "image_url",
                image_url: { "url": attachment.url },
            }));

        
            const messageReference = message.reference?.messageId
            ? await message.channel.messages.fetch(message.reference.messageId)
            : null;          


        return {
            role: role,
            content: [
                { type: "text", text: `[User: ${message.author.displayName}, ID: ${message.author.id}, ReplyTo: ${messageReference ? messageReference?.author.displayName : 'none'}] ${message.content}` },
                ...imageUrlsParts,
            ]
        } as ChatCompletionMessageParam;
    }

    private async addMessage(message: Message | ChatCompletionMessageParam): Promise<void> {
        if (!(message instanceof Message)) {
            this.messages.push(message);
            return;
        }
        
        const messageParam = await this.generateChatCompletionMessageParam(message);
        this.messages.push(messageParam);
    
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
