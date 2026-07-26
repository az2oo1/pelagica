import { getApi } from '@/api/getApi';
import { useQuery } from '@tanstack/react-query';
import { getMediaInfoApi } from '@jellyfin/sdk/lib/utils/api/media-info-api';
import type { MediaSourceInfo } from '@jellyfin/sdk/lib/generated-client/models';
import { getRetryConfig } from '@/utils/authErrorHandler';
import { detectSupportedCodecs } from '@/utils/videoCodecDetection';

export type PlayMethod = 'DirectPlay' | 'DirectStream' | 'Transcode';

export interface PlaybackDecision {
    playMethod: PlayMethod;
    mediaSource: MediaSourceInfo;
    playSessionId: string;
}

function buildDeviceProfile() {
    const codecs = detectSupportedCodecs();

    const videoCodecs: string[] = [];
    if (codecs.h264) videoCodecs.push('h264');
    if (codecs.hevc) videoCodecs.push('hevc');
    if (codecs.av1) videoCodecs.push('av1');
    if (codecs.vp9) videoCodecs.push('vp9');
    if (videoCodecs.length === 0) videoCodecs.push('h264');

    const directPlayProfiles = [
        {
            Container: 'mp4,m4v,webm',
            Type: 'Video' as const,
            VideoCodec: videoCodecs.join(','),
            AudioCodec: 'aac,mp3,opus,flac',
        },
        {
            Container: 'hls,m3u8,ts',
            Type: 'Video' as const,
            VideoCodec: videoCodecs.join(','),
            AudioCodec: 'aac,mp3,mp2,ac3,eac3,opus',
        },
    ];

    const transcodingProfiles = [
        {
            Container: 'ts',
            Type: 'Video' as const,
            VideoCodec: 'h264',
            AudioCodec: 'aac,mp3',
            Protocol: 'hls' as const,
            Context: 'Streaming' as const,
            MinSegments: 2,
            BreakOnNonKeyFrames: true,
            EnableAudioVbrEncoding: true,
        },
        {
            Container: 'mp4',
            Type: 'Video' as const,
            VideoCodec: 'h264',
            AudioCodec: 'aac',
            Protocol: 'hls' as const,
            Context: 'Streaming' as const,
            MinSegments: 2,
            BreakOnNonKeyFrames: true,
            EnableAudioVbrEncoding: true,
        },
    ];

    return {
        MaxStreamingBitrate: 80_000_000,
        MaxStaticBitrate: 100_000_000,
        DirectPlayProfiles: directPlayProfiles,
        TranscodingProfiles: transcodingProfiles,
        ContainerProfiles: [
            {
                Type: 'Video' as const,
                Container: 'm3u8,ts',
                Conditions: [],
            },
        ],
        CodecProfiles: [],
        SubtitleProfiles: [
            { Format: 'vtt', Method: 'External' as const },
            { Format: 'srt', Method: 'External' as const },
            { Format: 'ass', Method: 'External' as const },
            { Format: 'ssa', Method: 'External' as const },
        ],
    };
}

export function usePlaybackInfo(
    itemId: string | null | undefined,
    userId: string | undefined,
    audioStreamIndex?: number
) {
    return useQuery<PlaybackDecision>({
        queryKey: ['playbackInfo', itemId, audioStreamIndex],
        queryFn: async (): Promise<PlaybackDecision> => {
            const api = getApi();
            const mediaInfoApi = getMediaInfoApi(api);

            const response = await mediaInfoApi.getPostedPlaybackInfo({
                itemId: itemId!,
                userId,
                maxStreamingBitrate: 80_000_000,
                audioStreamIndex,
                autoOpenLiveStream: true,
                enableDirectPlay: true,
                enableDirectStream: true,
                enableTranscoding: true,
                allowVideoStreamCopy: true,
                allowAudioStreamCopy: true,
                playbackInfoDto: {
                    DeviceProfile: buildDeviceProfile(),
                },
            });

            const mediaSources = response.data.MediaSources;
            const playSessionId = response.data.PlaySessionId || '';

            if (!mediaSources || mediaSources.length === 0) {
                throw new Error('No media sources available');
            }

            let source = mediaSources[0];

            if (source.RequiresOpening || source.IsInfiniteStream || !!source.LiveStreamId) {
                if (source.RequiresOpening || !source.LiveStreamId) {
                    try {
                        const openRes = await mediaInfoApi.openLiveStream({
                            openLiveStreamDto: {
                                OpenToken: source.OpenToken || undefined,
                                ItemId: itemId!,
                                PlaySessionId: playSessionId,
                                DeviceProfile: buildDeviceProfile(),
                            },
                        });
                        if (openRes.data.MediaSource) {
                            source = openRes.data.MediaSource;
                        }
                    } catch (e) {
                        console.warn('[usePlaybackInfo] openLiveStream error:', e);
                    }
                }
            }

            let playMethod: PlayMethod;
            if (source.SupportsDirectPlay && !source.IsInfiniteStream && !source.LiveStreamId) {
                playMethod = 'DirectPlay';
            } else if (source.SupportsDirectStream && !source.IsInfiniteStream && !source.LiveStreamId) {
                playMethod = 'DirectStream';
            } else {
                playMethod = 'Transcode';
            }

            return { playMethod, mediaSource: source, playSessionId };
        },
        enabled: !!itemId,
        staleTime: Infinity,
        gcTime: 0,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        ...getRetryConfig(),
    });
}
