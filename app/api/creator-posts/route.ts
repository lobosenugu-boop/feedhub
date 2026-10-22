import { NextRequest, NextResponse } from 'next/server';

export interface CreatorPost {
  id: string;
  title: string;
  thumbnail?: string;
  url: string;
  views?: number;
  likes?: number;
  comments?: number;
  publishedAt: string;
  creatorName: string;
  platform: string;
}

async function fetchYouTubePosts(handle: string, name: string): Promise<CreatorPost[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];

  // 1. Find the channel
  const searchRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(handle || name)}&maxResults=1&key=${key}`
  );
  const searchData = await searchRes.json();
  const channelId = searchData.items?.[0]?.snippet?.channelId || searchData.items?.[0]?.id?.channelId;
  if (!channelId) return [];

  // 2. Get uploads playlist ID
  const chanRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${key}`
  );
  const chanData = await chanRes.json();
  const uploadsId = chanData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsId) return [];

  // 3. Get recent videos
  const playlistRes = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=6&key=${key}`
  );
  const playlistData = await playlistRes.json();
  const videoIds: string[] = (playlistData.items || []).map(
    (item: { snippet: { resourceId: { videoId: string } } }) => item.snippet.resourceId.videoId
  );
  if (!videoIds.length) return [];

  // 4. Get stats
  const statsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds.join(',')}&key=${key}`
  );
  const statsData = await statsRes.json();

  return (statsData.items || []).map((v: {
    id: string;
    snippet: { title: string; thumbnails: { medium: { url: string } }; publishedAt: string };
    statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
  }) => ({
    id: v.id,
    title: v.snippet.title,
    thumbnail: v.snippet.thumbnails?.medium?.url,
    url: `https://www.youtube.com/watch?v=${v.id}`,
    views: parseInt(v.statistics.viewCount || '0'),
    likes: parseInt(v.statistics.likeCount || '0'),
    comments: parseInt(v.statistics.commentCount || '0'),
    publishedAt: v.snippet.publishedAt,
    creatorName: name,
    platform: 'youtube',
  }));
}

export async function POST(req: NextRequest) {
  const { platform, handle, name, profileUrl } = await req.json();

  try {
    if (platform === 'youtube') {
      const posts = await fetchYouTubePosts(handle || name, name);
      return NextResponse.json({ posts });
    }
    // Other platforms: return empty — UI will show "visit profile" fallback
    return NextResponse.json({ posts: [], unsupported: true, profileUrl });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 });
  }
}
