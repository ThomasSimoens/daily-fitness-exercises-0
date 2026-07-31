#!/usr/bin/env node
/**
 * Fetches a YouTube video title and transcript.
 *
 * Usage:
 *   node .cline/skills/youtube-exercise-extractor/scripts/fetch-youtube-transcript.mjs "https://www.youtube.com/watch?v=VIDEO_ID"
 *
 * Outputs JSON to stdout:
 * {
 *   "title": "Video title",
 *   "author": "Channel name",
 *   "transcript": [ { "text": "...", "start": 0, "duration": 4 }, ... ]
 * }
 */

import { fetchTranscript, YoutubeTranscript } from 'youtube-transcript';

function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.slice(1) || null;
    }
    if (u.pathname === '/watch') {
      return u.searchParams.get('v');
    }
    if (u.pathname.startsWith('/shorts/')) {
      return u.pathname.split('/')[2] || null;
    }
    if (u.pathname.startsWith('/embed/')) {
      return u.pathname.split('/')[2] || null;
    }
    return null;
  } catch {
    return null;
  }
}

async function getVideoInfo(url) {
  const id = extractVideoId(url);
  if (!id) {
    console.error('Unable to extract video ID from URL:', url);
    process.exit(1);
  }

  // Lightweight metadata via oEmbed (no API key required)
  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`;
  const res = await fetch(oembedUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) {
    console.error('oEmbed metadata not available for:', url);
    process.exit(1);
  }
  const meta = await res.json();

  // Fetch transcript using yt-transcript-compatible library
  let transcriptItems;
  try {
    transcriptItems = await fetchTranscript(id, {
      lang: 'en',
      omitFooter: true,
    });
  } catch (err) {
    // Try any available transcript if English isn't available
    try {
      transcriptItems = await fetchTranscript(id, { omitFooter: true });
    } catch (err2) {
      transcriptItems = [];
    }
  }

  const output = {
    title: meta.title || '',
    author: meta.author_name || '',
    transcript: transcriptItems.map((item) => ({
      text: item.text.replace(/\s+/g, ' ').trim(),
      start: item.offset / 1000,
      duration: (item.duration || 0) / 1000,
    })),
  };

  console.log(JSON.stringify(output, null, 2));
}

const args = process.argv.slice(2);
const url = args[0];
if (!url) {
  console.error('Please provide a YouTube URL as the first argument.');
  process.exit(1);
}

getVideoInfo(url).catch((err) => {
  console.error('Failed to fetch YouTube transcript:', err.message || err);
  process.exit(1);
});
