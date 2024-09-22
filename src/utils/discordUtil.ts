import { EndBehaviorType, joinVoiceChannel, VoiceConnection } from "@discordjs/voice";
import { Guild, User } from "discord.js";
import { logger } from "../logger";
import OpusScript from "opusscript";
import fs from 'fs';
import { client } from "../client";
import { Transform, TransformOptions, pipeline } from "stream";
import { FileWriter } from "wav";

const activeStreams = new Map<string, boolean>();

export async function joinUserVoiceChannel(user: User, guild: Guild): Promise<VoiceConnection | null> {
    const member = guild.members.cache.get(user.id);
    if (!member) {
        logger.warn('User not found in guild');
        return null;
    }

    const voiceChannel = member.voice.channel;
    if (!voiceChannel) {
        logger.warn('User not in voice channel');
        return null;
    }

    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: false,
    });

    return connection;
}

export function listenToAudio(connection: VoiceConnection): void {
    const receiver = connection.receiver;

    receiver.speaking.on('start', (userId) => {
        const username = findUsername(userId);
        const filename = `./recordings/${Date.now()}_${username}.wav`;

        if (!username) {
            logger.warn('Failed to find username');
            return;
        }

        // Check if the user is already being processed
        if (activeStreams.has(userId)) {
            logger.warn(`Already processing audio for user ${username}, skipping duplicate stream.`);
            return;
        }

        logger.info(`User ${username} started speaking`);
        activeStreams.set(userId, true); // Mark user as being processed

        const opusEncoder = new OpusScript(48000, 2);
        logger.info(`Recording audio for user ${username} to ${filename}`);
        const audioStream = receiver.subscribe(userId, {
            end: {
                behavior: EndBehaviorType.AfterSilence,
                duration: 500,
            },
        })
        .pipe(//@ts-ignore
            new OpusDecodingStream({}, opusEncoder)
        ) //@ts-ignore
        .pipe(new FileWriter(filename, {
            sampleRate: 48000,
            channels: 2,
        }));
        logger.info(`Subscribed to audio stream for user ${username}`);
    });

    connection.on('stateChange', (oldState, newState) => {
        if (newState.status === 'destroyed') {
            logger.info('Connection destroyed');
        }
    });
}

function findUsername(userId: string): string | undefined {
    const user = client.users.cache.get(userId);
    return user?.username;
}

class OpusDecodingStream extends Transform {
    encoder

    constructor(options: any, encoder: any) {
        super(options)
        this.encoder = encoder
    }

    _transform(data: any, encoding: any, callback: () => void) {
        this.push(this.encoder.decode(data))
        callback()
    }
}
