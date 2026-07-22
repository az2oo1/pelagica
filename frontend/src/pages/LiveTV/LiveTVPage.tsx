import { useState } from 'react';
import Page from '../Page';
import { useLiveTvChannels, useLiveTvRecommendedPrograms } from '@/hooks/api/useLiveTv';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getPrimaryImageUrl, getBackdropUrl } from '@/utils/jellyfinUrls';
import { buildPlayerUrl } from '@/utils/playerUrl';
import { Link } from 'react-router';
import { Tv, Play, Radio, Search, Calendar, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ticksToReadableTime } from '@/utils/timeConversion';

export default function LiveTVPage() {
    const { data: channels, isLoading: channelsLoading, isError: channelsError } = useLiveTvChannels();
    const { data: recommended } = useLiveTvRecommendedPrograms();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'channels' | 'guide' | 'airing'>('channels');

    // Filter channels
    const filteredChannels = (channels || []).filter((ch) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        const nameMatch = ch.Name?.toLowerCase().includes(query);
        const numberMatch = ch.ChannelNumber?.toLowerCase().includes(query);
        const currentProgMatch = ch.CurrentProgram?.Name?.toLowerCase().includes(query);
        return nameMatch || numberMatch || currentProgMatch;
    });

    // Featured hero item (first channel with program or first recommended program)
    const featuredProgram = recommended?.[0];
    const featuredChannel = channels?.find((c) => c.Id === featuredProgram?.ChannelId) || channels?.[0];

    return (
        <Page
            title="Live TV - Pelagica"
            requiresAuth
            overlayHeader
            pagePadding={false}
        >
            {/* 1. CINEMATIC HERO MEDIABAR (Pelagica Signature Style) */}
            {featuredChannel && (
                <div className="relative min-h-[480px] sm:min-h-[540px] flex items-end pb-12 pt-28 px-4 sm:px-12 overflow-hidden border-b border-border/30">
                    {/* Backdrop image */}
                    <div
                        className="absolute inset-0 bg-cover bg-center -z-20 transition-opacity duration-700 scale-105"
                        style={{
                            backgroundImage: `url('${getBackdropUrl(featuredProgram?.Id || featuredChannel.Id!)}')`,
                        }}
                    />
                    {/* Dark gradient vignettes */}
                    <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent max-w-4xl -z-10" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent -z-10" />

                    {/* Content */}
                    <div className="max-w-2xl space-y-4 z-10">
                        <div className="flex items-center gap-3">
                            <Badge className="bg-red-600 text-white font-semibold text-xs px-2.5 py-1 flex items-center gap-1.5 shadow-md">
                                <Radio className="w-3.5 h-3.5 animate-pulse" /> LIVE NOW
                            </Badge>
                            {featuredChannel.ChannelNumber && (
                                <Badge variant="outline" className="border-white/30 text-white font-mono text-xs backdrop-blur-xs">
                                    CH {featuredChannel.ChannelNumber}
                                </Badge>
                            )}
                            <span className="text-xs font-bold text-brand uppercase tracking-wider">
                                {featuredChannel.Name}
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white drop-shadow-md">
                            {featuredProgram?.Name || featuredChannel.Name}
                        </h1>

                        {/* Overview */}
                        {featuredProgram?.Overview && (
                            <p className="text-sm sm:text-base text-gray-300 line-clamp-3 leading-relaxed max-w-xl drop-shadow-sm">
                                {featuredProgram.Overview}
                            </p>
                        )}

                        {/* Metadata & Actions */}
                        <div className="flex flex-wrap items-center gap-4 pt-2">
                            <Button asChild size="lg" className="gap-2 cursor-pointer shadow-xl font-bold px-6">
                                <Link to={buildPlayerUrl(featuredChannel.Id!)}>
                                    <Play className="w-5 h-5 fill-current" /> Watch Live
                                </Link>
                            </Button>
                            {featuredProgram?.RunTimeTicks && (
                                <span className="text-xs font-mono text-gray-300 flex items-center gap-1 bg-black/40 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10">
                                    <Clock className="w-3.5 h-3.5" />
                                    {ticksToReadableTime(featuredProgram.RunTimeTicks)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MAIN CONTENT CONTAINER */}
            <div className="px-4 sm:px-12 py-8 space-y-8">
                {/* TOP HEADER & SWITCHER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                            <Tv className="w-5 h-5 text-brand" />
                            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                                {activeTab === 'channels' && 'Live TV Channels'}
                                {activeTab === 'guide' && 'Electronic Program Guide (EPG)'}
                                {activeTab === 'airing' && 'Airing Now'}
                            </h2>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {activeTab === 'channels' && `Browsing ${filteredChannels.length} active tuner channels`}
                            {activeTab === 'guide' && 'Live broadcast schedule & program timeline'}
                            {activeTab === 'airing' && 'Currently recommended live broadcasts'}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        {/* Search Filter Input */}
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search channels or shows..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-sm bg-background/60 border-border/40"
                            />
                        </div>

                        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
                            <TabsList className="grid w-full sm:w-[220px] grid-cols-2">
                                <TabsTrigger value="channels" className="text-xs gap-1.5 cursor-pointer">
                                    <Tv className="w-3.5 h-3.5" /> Channels
                                </TabsTrigger>
                                <TabsTrigger value="guide" className="text-xs gap-1.5 cursor-pointer">
                                    <Calendar className="w-3.5 h-3.5" /> Guide
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </div>

                {/* 2. CHANNELS TAB */}
                {activeTab === 'channels' && (
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground font-mono">
                                Showing {filteredChannels.length} active tuner channels
                            </span>
                        </div>

                        {channelsLoading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                                {Array.from({ length: 16 }).map((_, i) => (
                                    <Skeleton key={i} className="aspect-square rounded-xl" />
                                ))}
                            </div>
                        ) : channelsError || filteredChannels.length === 0 ? (
                            <div className="p-12 text-center border border-dashed border-border/60 rounded-xl space-y-2">
                                <Tv className="w-10 h-10 text-muted-foreground mx-auto opacity-40" />
                                <p className="text-sm text-muted-foreground">No channels found</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                                {filteredChannels.map((channel) => {
                                    const currentProg = channel.CurrentProgram;
                                    return (
                                        <Link
                                            key={channel.Id}
                                            to={buildPlayerUrl(channel.Id!)}
                                            className="group relative flex flex-col rounded-xl overflow-hidden bg-card border border-border/40 hover:border-brand/60 transition-all duration-300 hover:-translate-y-1 p-3 text-center items-center justify-between space-y-2 shadow-sm"
                                        >
                                            {/* Channel Logo Frame */}
                                            <div className="w-20 h-20 rounded-xl bg-black/40 border border-white/10 p-2 flex items-center justify-center group-hover:border-brand/40 transition-colors relative">
                                                <img
                                                    src={getPrimaryImageUrl(channel.Id!, { width: 120, height: 120 })}
                                                    alt={channel.Name || ''}
                                                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300 relative z-10"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLElement;
                                                        target.style.display = 'none';
                                                        if (target.nextElementSibling) {
                                                            (target.nextElementSibling as HTMLElement).style.display = 'flex';
                                                        }
                                                    }}
                                                />
                                                <div className="hidden absolute inset-0 items-center justify-center">
                                                    <Tv className="w-8 h-8 text-muted-foreground/40 group-hover:text-brand transition-colors" />
                                                </div>
                                            </div>

                                            {/* Channel Details */}
                                            <div className="w-full min-w-0">
                                                {channel.ChannelNumber && (
                                                    <span className="text-[10px] font-mono font-bold bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded">
                                                        CH {channel.ChannelNumber}
                                                    </span>
                                                )}
                                                <h3 className="font-bold text-xs truncate mt-1 group-hover:text-brand transition-colors" title={channel.Name || ''}>
                                                    {channel.Name}
                                                </h3>
                                                {currentProg?.Name && (
                                                    <p className="text-[10px] text-muted-foreground truncate mt-0.5" title={currentProg.Name}>
                                                        {currentProg.Name}
                                                    </p>
                                                )}
                                            </div>

                                            <Button size="sm" variant="ghost" className="w-full h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Play className="w-3 h-3 fill-current" /> Tune In
                                            </Button>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                )}

                {/* 3. GUIDE / EPG TAB: Dedicated EPG Timetable Matrix */}
                {activeTab === 'guide' && (
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-muted-foreground">
                                Electronic Program Guide (EPG Timeline)
                            </h3>
                            <Badge variant="outline" className="text-[10px] font-mono">
                                Live Schedule
                            </Badge>
                        </div>

                        {channelsLoading ? (
                            <div className="space-y-3">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <Skeleton key={i} className="h-24 w-full rounded-xl" />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredChannels.map((ch) => {
                                    const currentProg = ch.CurrentProgram;
                                    return (
                                        <div
                                            key={ch.Id}
                                            className="flex flex-col sm:flex-row rounded-xl bg-card border border-border/40 overflow-hidden hover:border-brand/40 transition-all duration-200"
                                        >
                                            {/* Left Channel Header Column */}
                                            <div className="w-full sm:w-56 p-3.5 bg-muted/20 border-b sm:border-b-0 sm:border-r border-border/40 flex items-center justify-between sm:justify-start gap-3 shrink-0">
                                                <div className="w-12 h-12 rounded-lg bg-black/40 border border-white/10 p-1 flex items-center justify-center shrink-0">
                                                    <img
                                                        src={getPrimaryImageUrl(ch.Id!, { width: 80, height: 80 })}
                                                        alt={ch.Name || ''}
                                                        className="w-full h-full object-contain"
                                                        onError={(e) => {
                                                            (e.target as HTMLElement).style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    {ch.ChannelNumber && (
                                                        <span className="text-[9px] font-mono font-bold bg-white/10 text-muted-foreground px-1.5 py-0.5 rounded">
                                                            CH {ch.ChannelNumber}
                                                        </span>
                                                    )}
                                                    <h4 className="font-bold text-xs truncate mt-0.5" title={ch.Name || ''}>
                                                        {ch.Name}
                                                    </h4>
                                                </div>
                                                <Button asChild size="sm" variant="secondary" className="h-7 text-[11px] px-2.5 shrink-0 gap-1">
                                                    <Link to={buildPlayerUrl(ch.Id!)}>
                                                        <Play className="w-3 h-3 fill-current" /> Tune In
                                                    </Link>
                                                </Button>
                                            </div>

                                            {/* Right EPG Timeline Matrix */}
                                            <div className="flex-1 p-3.5 flex flex-col justify-center space-y-2">
                                                {currentProg ? (
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] flex items-center gap-1">
                                                                    <Radio className="w-2.5 h-2.5 animate-pulse" /> ON AIR
                                                                </Badge>
                                                                <h3 className="font-bold text-sm text-foreground truncate">
                                                                    {currentProg.Name}
                                                                </h3>
                                                            </div>
                                                            {currentProg.RunTimeTicks && (
                                                                <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                                                                    {ticksToReadableTime(currentProg.RunTimeTicks)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {currentProg.Overview && (
                                                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                                {currentProg.Overview}
                                                            </p>
                                                        )}
                                                        {/* Schedule Progress Line */}
                                                        <div className="w-full h-1 rounded-full bg-muted overflow-hidden mt-1">
                                                            <div className="h-full bg-brand rounded-full w-1/2 animate-pulse" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-muted-foreground/60 italic">
                                                        No EPG guide info for this channel
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                )}
            </div>
        </Page>
    );
}
