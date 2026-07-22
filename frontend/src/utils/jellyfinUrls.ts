import { getAccessToken, getServerUrl, getDeviceId } from './localstorageCredentials';
import { getSupportedVideoCodecs } from './videoCodecDetection';
import type { PlayMethod } from '@/hooks/api/usePlaybackInfo';
interface Credentials {
    server: string;
    token: string;
}

function resolveCredentials(): Credentials | null {
    const server = getServerUrl();
    const token = getAccessToken();
    return server && token ? { server, token } : null;
}

export interface ImageSize {
    width?: number;
    height?: number;
    maxWidth?: number;
    maxHeight?: number;
}

export interface ItemImageOptions {
    index?: number;
    size?: ImageSize;
    quality?: number;
    tag?: string;
    fallback?: string;
}

function buildItemImageUrl(
    itemId: string,
    imageType: string,
    { index, size, tag, quality, fallback = '' }: ItemImageOptions = {}
): string {
    try {
        const creds = resolveCredentials();
        if (!creds) return fallback;

        const url = new URL(creds.server);
        url.pathname =
            index !== undefined
                ? `/Items/${itemId}/Images/${imageType}/${index}`
                : `/Items/${itemId}/Images/${imageType}`;

        url.searchParams.append('quality', quality?.toString() || '90');
        if (tag) url.searchParams.set('tag', tag);
        if (size?.width) url.searchParams.append('width', size.width.toString());
        if (size?.height) url.searchParams.append('height', size.height.toString());
        if (size?.maxWidth) url.searchParams.append('maxWidth', size.maxWidth.toString());
        if (size?.maxHeight) url.searchParams.append('maxHeight', size.maxHeight.toString());

        return url.toString();
    } catch {
        return fallback;
    }
}

export function getBackdropUrl(itemId: string, size?: ImageSize, tag?: string, quality?: number) {
    return buildItemImageUrl(itemId, 'Backdrop', {
        index: 0,
        size,
        tag,
        quality,
        fallback: '/default-backdrop.jpg',
    });
}

export function getLogoUrl(itemId: string, size?: ImageSize, tag?: string, quality?: number) {
    return buildItemImageUrl(itemId, 'Logo', { size, tag, quality });
}

export function getThumbUrl(itemId: string, size?: ImageSize, tag?: string, quality?: number) {
    return buildItemImageUrl(itemId, 'Thumb', {
        size,
        tag,
        quality,
        fallback: '/default-thumb.jpg',
    });
}

export function getPrimaryImageUrl(
    itemId: string,
    size?: ImageSize,
    tag?: string,
    quality?: number
) {
    return buildItemImageUrl(itemId, 'Primary', {
        index: 0,
        size,
        tag,
        quality,
        fallback: '/default-thumb.jpg',
    });
}

export function getItemImageUrl(
    itemId: string,
    imageType: string,
    index: number,
    size?: ImageSize,
    tag?: string,
    quality?: number
) {
    return buildItemImageUrl(itemId, imageType, { index, size, tag, quality });
}

// https://jellyfin.jan.run/Audio/7ef9a3411c0387ab625e63ff19e5c71b/universal
// ?UserId=cffdf3fcb5724b3d8cbd980d3a72cbb8
// &DeviceId=TW96aWxsYS81LjAgKE1hY2ludG9zaDsgSW50ZWwgTWFjIE9TIFggMTBfMTVfNykgQXBwbGVXZWJLaXQvNjA1LjEuMTUgKEtIVE1MLCBsaWtlIEdlY2tvKSBWZXJzaW9uLzE4LjUgU2FmYXJpLzYwNS4xLjE1fDE3NTYwMjYzOTY4MTI1
// &MaxStreamingBitrate=150000000
// &Container=opus%2Cwebm%7Copus%2Cts%7Cmp3%2Cmp3%2Caac%2Cm4a%7Caac%2Cm4b%7Caac%2Cflac%2Calac%2Cm4a%7Calac%2Cm4b%7Calac%2Cwebma%2Cwebm%7Cwebma%2Cwav%2Cogg%2Cmp4%7Copus
// &TranscodingContainer=mp4
// &TranscodingProtocol=hls
// &AudioCodec=aac
// &ApiKey=d0b80ecc697e4b7994fb790e65a09667
// &PlaySessionId=1768386958787
// &StartTimeTicks=0
// &EnableRedirection=true
// &EnableRemoteMedia=false
// &EnableAudioVbrEncoding=true

export function getAudioStreamUrl(itemId: string, userId?: string) {
    try {
        const server = getServerUrl();
        const token = getAccessToken();

        if (!server || !token) return '';

        const url = new URL(server);
        url.pathname = `/Audio/${itemId}/universal`;
        if (userId) url.searchParams.append('UserId', userId);
        url.searchParams.append('ApiKey', token);
        url.searchParams.append('AudioCodec', 'aac');
        url.searchParams.append(
            'Container',
            'opus,webm|opus,ts|mp3,mp3,aac,m4a|aac,m4b|aac,flac,alac,m4a|alac,m4b|alac,webma,webm|webma,wav,ogg,mp4|opus'
        );
        url.searchParams.append('TranscodingContainer', 'mp4');
        url.searchParams.append('TranscodingProtocol', 'hls');
        url.searchParams.append('StartTimeTicks', '0');
        url.searchParams.append('MaxStreamingBitrate', '150000000');
        url.searchParams.append('EnableRedirection', 'true');
        url.searchParams.append('EnableRemoteMedia', 'false');
        url.searchParams.append('EnableAudioVbrEncoding', 'true');

        // https://jellyfin.jan.run/Audio/7ef9a3411c0387ab625e63ff19e5c71b/universal
        // ?UserId=cffdf3fcb5724b3d8cbd980d3a72cbb8
        // &DeviceId=TW96aWxsYS81LjAgKE1hY2ludG9zaDsgSW50ZWwgTWFjIE9TIFggMTBfMTVfNykgQXBwbGVXZWJLaXQvNjA1LjEuMTUgKEtIVE1MLCBsaWtlIEdlY2tvKSBWZXJzaW9uLzE4LjUgU2FmYXJpLzYwNS4xLjE1fDE3NTYwMjYzOTY4MTI1
        // &MaxStreamingBitrate=150000000
        // &Container=opus%2Cwebm%7Copus%2Cts%7Cmp3%2Cmp3%2Caac%2Cm4a%7Caac%2Cm4b%7Caac%2Cflac%2Calac%2Cm4a%7Calac%2Cm4b%7Calac%2Cwebma%2Cwebm%7Cwebma%2Cwav%2Cogg%2Cmp4%7Copus
        // &TranscodingContainer=mp4
        // &TranscodingProtocol=hls
        // &AudioCodec=aac
        // &ApiKey=d0b80ecc697e4b7994fb790e65a09667
        // &PlaySessionId=1768386958787
        // &StartTimeTicks=0
        // &EnableRedirection=true
        // &EnableRemoteMedia=false
        // &EnableAudioVbrEncoding=true

        return url.toString();
    } catch {
        return '';
    }
}



export function getVideoStreamUrl(
    itemId: string,
    options: {
        mediaSourceId?: string;
        playSessionId?: string;
        audioStreamIndex?: number;
        startTimeTicks?: number;
        liveStreamId?: string;
    }
) {
    try {
        const server = getServerUrl();
        const token = getAccessToken();

        if (!server || !token) return '';

        const url = new URL(server);
        url.pathname = `/Videos/${itemId}/master.m3u8`;
        url.searchParams.append('MediaSourceId', options.mediaSourceId || itemId);
        url.searchParams.append('ApiKey', token);
        url.searchParams.append('DeviceId', getDeviceId());
        url.searchParams.append('VideoCodec', getSupportedVideoCodecs());
        url.searchParams.append('AudioCodec', 'aac');
        url.searchParams.append('SegmentContainer', 'mp4');
        url.searchParams.append('MinSegments', '2');
        url.searchParams.append('BreakOnNonKeyFrames', 'true');
        url.searchParams.append('RequireAvc', 'false');

        url.searchParams.append('MaxWidth', '3840');
        url.searchParams.append('MaxHeight', '2160');
        url.searchParams.append('VideoBitrate', '80000000'); // 80 Mbps
        url.searchParams.append('AudioBitrate', '384000'); // 384 kbps
        url.searchParams.append('MaxFramerate', '60');

        url.searchParams.append('TranscodingProtocol', 'hls');

        if (options.liveStreamId !== undefined) {
            url.searchParams.append('LiveStreamId', options.liveStreamId);
        }
        if (options.playSessionId !== undefined)
            url.searchParams.append('PlaySessionId', options.playSessionId);
        if (options.audioStreamIndex !== undefined) {
            url.searchParams.append('AudioStreamIndex', options.audioStreamIndex.toString());
        }
        if (options.startTimeTicks !== undefined && options.startTimeTicks > 0) {
            url.searchParams.append('StartTimeTicks', options.startTimeTicks.toString());
        }

        return url.toString();
    } catch {
        return '';
    }
}

export function getDirectStreamUrl(
    itemId: string,
    options: {
        mediaSourceId?: string;
        container?: string;
        audioStreamIndex?: number;
        playSessionId?: string;
        startTimeTicks?: number;
        liveStreamId?: string;
    }
) {
    try {
        const creds = resolveCredentials();
        if (!creds) return '';

        const url = new URL(creds.server);
        const container = options.container || 'mp4';
        url.pathname = `/Videos/${itemId}/stream.${container}`;
        url.searchParams.append('Static', 'true');
        url.searchParams.append('MediaSourceId', options.mediaSourceId || itemId);
        url.searchParams.append('ApiKey', creds.token);

        if (options.liveStreamId !== undefined) {
            url.searchParams.append('LiveStreamId', options.liveStreamId);
        }
        if (options.playSessionId !== undefined)
            url.searchParams.append('PlaySessionId', options.playSessionId);
        if (options.audioStreamIndex !== undefined)
            url.searchParams.append('AudioStreamIndex', options.audioStreamIndex.toString());
        if (options.startTimeTicks !== undefined && options.startTimeTicks > 0) {
            url.searchParams.append('StartTimeTicks', options.startTimeTicks.toString());
        }

        return url.toString();
    } catch {
        return '';
    }
}

export interface PlaybackStreamResult {
    url: string;
    mimeType: string;
}

const BROWSER_PLAYABLE_CONTAINERS: Record<string, string> = {
    mp4: 'video/mp4',
    m4v: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/mp4',
    ogv: 'video/ogg',
    mp3: 'audio/mpeg',
    aac: 'audio/aac',
    flac: 'audio/flac',
    m4a: 'audio/mp4',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
};

export function getPlaybackStreamUrl(
    itemId: string,
    playMethod: PlayMethod,
    options: {
        playSessionId?: string;
        audioStreamIndex?: number;
        mediaSourceId?: string;
        container?: string;
        transcodingUrl?: string | null;
        directStreamUrl?: string | null;
        liveStreamId?: string | null;
        startTimeTicks?: number;
        isLiveTv?: boolean;
    }
): PlaybackStreamResult {
    const creds = resolveCredentials();

    const appendApiKey = (inputUrl: string): string => {
        if (!creds?.token) return inputUrl;
        if (!inputUrl.includes('api_key=') && !inputUrl.includes('ApiKey=')) {
            const sep = inputUrl.includes('?') ? '&' : '?';
            return `${inputUrl}${sep}ApiKey=${creds.token}`;
        }
        return inputUrl;
    };

    if (options.isLiveTv) {
        if (options.transcodingUrl && creds) {
            const base = creds.server.replace(/\/+$/, '');
            const path = options.transcodingUrl.startsWith('/')
                ? options.transcodingUrl
                : `/${options.transcodingUrl}`;
            let url = `${base}${path}`;
            if (options.liveStreamId && !url.includes('LiveStreamId=')) {
                const sep = url.includes('?') ? '&' : '?';
                url = `${url}${sep}LiveStreamId=${options.liveStreamId}`;
            }
            return {
                url: appendApiKey(url),
                mimeType: 'application/x-mpegURL',
            };
        }
        if (options.directStreamUrl && creds) {
            const base = creds.server.replace(/\/+$/, '');
            const path = options.directStreamUrl.startsWith('/')
                ? options.directStreamUrl
                : `/${options.directStreamUrl}`;
            let url = `${base}${path}`;
            if (options.liveStreamId && !url.includes('LiveStreamId=')) {
                const sep = url.includes('?') ? '&' : '?';
                url = `${url}${sep}LiveStreamId=${options.liveStreamId}`;
            }
            return {
                url: appendApiKey(url),
                mimeType: 'application/x-mpegURL',
            };
        }
        return {
            url: getVideoStreamUrl(itemId, {
                mediaSourceId: options.mediaSourceId,
                audioStreamIndex: options.audioStreamIndex,
                playSessionId: options.playSessionId,
                liveStreamId: options.liveStreamId || undefined,
            }),
            mimeType: 'application/x-mpegURL',
        };
    }

    const container = options.container?.toLowerCase();
    const mimeType = container ? BROWSER_PLAYABLE_CONTAINERS[container] : undefined;

    // Prefer DirectPlay / DirectStream when format is natively supported by browser
    if ((playMethod === 'DirectPlay' || playMethod === 'DirectStream' || (mimeType && !options.transcodingUrl)) && mimeType && !options.isLiveTv) {
        return {
            url: getDirectStreamUrl(itemId, {
                mediaSourceId: options.mediaSourceId,
                container,
                audioStreamIndex: options.audioStreamIndex,
                playSessionId: options.playSessionId,
                startTimeTicks: options.startTimeTicks,
                liveStreamId: options.liveStreamId || undefined,
            }),
            mimeType,
        };
    }

    if (options.transcodingUrl && creds) {
        const base = creds.server.replace(/\/+$/, '');
        const path = options.transcodingUrl.startsWith('/')
            ? options.transcodingUrl
            : `/${options.transcodingUrl}`;
        let url = `${base}${path}`;
        if (options.startTimeTicks !== undefined && options.startTimeTicks > 0) {
            const separator = url.includes('?') ? '&' : '?';
            url = `${url}${separator}StartTimeTicks=${options.startTimeTicks}`;
        }
        return {
            url: appendApiKey(url),
            mimeType: 'application/x-mpegURL',
        };
    }

    return {
        url: getVideoStreamUrl(itemId, {
            audioStreamIndex: options.audioStreamIndex,
            playSessionId: options.playSessionId,
            startTimeTicks: options.startTimeTicks,
            liveStreamId: options.liveStreamId || undefined,
        }),
        mimeType: 'application/x-mpegURL',
    };
}

export function getSubtitleUrl(
    itemId: string,
    mediaSourceId: string,
    subtitleStreamIndex: number,
    format: 'vtt' | 'srt' = 'vtt'
) {
    try {
        const server = getServerUrl();
        const token = getAccessToken();

        if (!server || !token) return '';

        const url = new URL(server);
        url.pathname = `/Videos/${itemId}/${mediaSourceId}/Subtitles/${subtitleStreamIndex}/0/Stream.${format}`;
        url.searchParams.append('ApiKey', token);

        return url.toString();
    } catch {
        return '';
    }
}


export function getStudioImageUrl(studioName: string) {
    const server = getServerUrl() || '';
    return `/api/studios/${encodeURIComponent(studioName)}/thumb?server=${encodeURIComponent(server)}`;
}

export function getTrickplayImageUrl(itemId: string, width: number, imageIndex: number) {
    try {
        const server = getServerUrl();
        const token = getAccessToken();

        if (!server || !token) return '';

        const url = new URL(server);
        url.pathname = `/Videos/${itemId}/Trickplay/${width}/${imageIndex}.jpg`;
        url.searchParams.append('ApiKey', token);
        url.searchParams.append('MediaSourceId', itemId);

        return url.toString();
    } catch {
        return '';
    }
}

export function getUserProfileImageUrl(userId: string): string {
    try {
        const server = getServerUrl();
        const token = getAccessToken();

        if (!server || !token) return '';

        const url = new URL(server);
        url.pathname = `/Users/${userId}/Images/Primary`;
        url.searchParams.append('quality', '90');

        return url.toString();
    } catch {
        return '';
    }
}

export function getPublicUserProfileImageUrl(serverUrl: string, userId: string, tag?: string): string {
    try {
        if (!serverUrl || !userId) return '';
        const url = new URL(serverUrl);
        url.pathname = `/Users/${userId}/Images/Primary`;
        url.searchParams.append('quality', '90');
        if (tag) url.searchParams.append('tag', tag);

        return url.toString();
    } catch {
        return '';
    }
}


export function getDownloadurl(itemId: string) {
    try {
        const server = getServerUrl();
        const token = getAccessToken();

        if (!server || !token) return '';

        const url = new URL(server);
        url.pathname = `/Items/${itemId}/Download`;
        url.searchParams.append('MediaSourceId', itemId);
        url.searchParams.append('ApiKey', token);

        return url.toString();
    } catch {
        return '';
    }
}
