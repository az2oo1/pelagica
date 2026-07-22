import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { Captions, EllipsisVertical, Image, RotateCcw, Trash2, PencilLine, Search, Link2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/hooks/api/useCurrentUser';
import { useRef } from 'react';
import ManageImageButton from './ManageImageButton';
import RefreshItemMetadataButton from './RefreshItemMetadataButton';
import EditItemMetadataButton from './EditItemMetadataButton';
import MediaDeleteButton from './MediaDeleteButton';
import SubtitleDownloadDialog from '../pages/Item/SubtitleDownloadDialog';
import IdentifyDialog from './IdentifyDialog';
import { getDownloadurl } from '@/utils/jellyfinUrls';
import { toast } from 'sonner';

const ItemAdminButton = ({
    item,
    showSubtitlesButton = false,
}: {
    item: BaseItemDto;
    showSubtitlesButton?: boolean;
}) => {
    const { t } = useTranslation('item');
    const { data: currentUser } = useCurrentUser();
    const manageImagesTriggerRef = useRef<HTMLButtonElement>(null);
    const refreshMetadataTriggerRef = useRef<HTMLButtonElement>(null);
    const deleteTriggerRef = useRef<HTMLButtonElement>(null);
    const subtitlesTriggerRef = useRef<HTMLButtonElement>(null);
    const editMetadataTriggerRef = useRef<HTMLButtonElement>(null);
    const identifyTriggerRef = useRef<HTMLButtonElement>(null);

    if (currentUser?.Policy?.IsAdministrator !== true) return null;

    const showIdentify = item.Type === 'Movie' || item.Type === 'Series';
    const canStream = item.Type !== 'Series' && item.Type !== 'Season' && item.Type !== 'BoxSet' && item.Type !== 'MusicArtist' && item.Type !== 'Genre' && item.Type !== 'Playlist';

    const handleCopyStreamLink = () => {
        const streamUrl = getDownloadurl(item.Id || '');
        if (streamUrl) {
            void navigator.clipboard.writeText(streamUrl).then(() => {
                toast.success(t('stream_link_copied', { defaultValue: 'Stream link copied to clipboard!' }));
            }).catch((err) => {
                console.error('Failed to copy stream link:', err);
                toast.error(t('stream_link_error', { defaultValue: 'Could not copy stream link.' }));
            });
        } else {
            toast.error(t('stream_link_error', { defaultValue: 'Could not copy stream link.' }));
        }
    };

    return (
        <>
            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                    <Button variant={'outline'} size={'icon'} className="hover:scale-105 active:scale-95 transition-transform duration-200 ease-out">
                        <EllipsisVertical />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={'end'}>
                    {showSubtitlesButton && (
                        <DropdownMenuItem
                            onClick={() => {
                                setTimeout(() => subtitlesTriggerRef.current?.click(), 0);
                            }}
                        >
                            <Captions />
                            {t('subtitles')}
                        </DropdownMenuItem>
                    )}
                    {showIdentify && (
                        <DropdownMenuItem
                            onClick={() => {
                                setTimeout(() => identifyTriggerRef.current?.click(), 0);
                            }}
                        >
                            <Search />
                            {t('identify', { defaultValue: 'Identify' })}
                        </DropdownMenuItem>
                    )}
                    {canStream && (
                        <DropdownMenuItem
                            onClick={handleCopyStreamLink}
                        >
                            <Link2 />
                            {t('copy_stream_link', { defaultValue: 'Copy Stream Link' })}
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                        onClick={() => {
                            setTimeout(() => manageImagesTriggerRef.current?.click(), 0);
                        }}
                    >
                        <Image />
                        {t('manage_images')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => {
                            setTimeout(() => refreshMetadataTriggerRef.current?.click(), 0);
                        }}
                    >
                        <RotateCcw />
                        {t('refreshMetadata')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => {
                            setTimeout(() => editMetadataTriggerRef.current?.click(), 0);
                        }}
                    >
                        <PencilLine />
                        {t('editMetadata')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => {
                            setTimeout(() => deleteTriggerRef.current?.click(), 0);
                        }}
                    >
                        <Trash2 />
                        {t('deleteItem')}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <div style={{ display: 'none' }}>
                <SubtitleDownloadDialog
                    item={item}
                    trigger={<button ref={subtitlesTriggerRef} />}
                />
                {showIdentify && (
                    <IdentifyDialog
                        item={item}
                        trigger={<button ref={identifyTriggerRef} />}
                    />
                )}
                <ManageImageButton item={item} trigger={<button ref={manageImagesTriggerRef} />} />
                <RefreshItemMetadataButton
                    item={item}
                    trigger={<button ref={refreshMetadataTriggerRef} />}
                />
                <EditItemMetadataButton
                    item={item}
                    trigger={<button ref={editMetadataTriggerRef} />}
                />
                <MediaDeleteButton item={item} trigger={<button ref={deleteTriggerRef} />} />
            </div>
        </>
    );
};

export default ItemAdminButton;
