import { getPublishDateTime, toDateString } from './date';

export interface Story {
  slug: string;
  title: string;
  publishDate: string;
  href: string;
  tagLine?: string;
  wordCount: number;
  readingTime: string;
  downloadUrl?: string;
}

export interface StoryFrontmatter {
  title: string;
  publishDate: string | Date;
  author?: string;
  tags?: string[];
  downloadUrl?: string;
}

const storyModules = import.meta.glob<{ frontmatter: StoryFrontmatter }>(
  '../pages/stories/*.md',
  { eager: true }
);

const storyRawModules = import.meta.glob<string>('../pages/stories/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const WORDS_PER_MINUTE = 225;

function stripFrontmatter(raw: string): string {
  if (!raw.startsWith('---')) return raw;
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return raw;
  return raw.slice(end + 4).trim();
}

function countWords(text: string): number {
  const plain = text
    .replace(/\\./g, '')
    .replace(/[#*_~`[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain ? plain.split(/\s+/).length : 0;
}

function formatReadingTime(words: number): string {
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
  return minutes === 1 ? '1 min read' : `${minutes} min read`;
}

export function getStories(sort: 'asc' | 'desc' = 'desc'): Story[] {
  const stories = Object.entries(storyModules).map(([filepath, { frontmatter }]) => {
    const slug = filepath.replace('../pages/stories/', '').replace(/\.md$/, '');
    const raw = storyRawModules[filepath] ?? '';
    const wordCount = countWords(stripFrontmatter(raw));

    return {
      slug,
      title: frontmatter.title,
      publishDate: toDateString(frontmatter.publishDate),
      href: `/stories/${slug}/`,
      tagLine: frontmatter.tags ? frontmatter.tags.join(', ').toLowerCase() : undefined,
      wordCount,
      readingTime: formatReadingTime(wordCount),
      downloadUrl: frontmatter.downloadUrl,
    };
  });

  return stories.sort((a, b) => {
    const diff = getPublishDateTime(a.publishDate) - getPublishDateTime(b.publishDate);
    return sort === 'asc' ? diff : -diff;
  });
}

const authorsNotesModules = import.meta.glob('../pages/authors-notes/*.md');

export function pathToSlug(path: string): string {
  const match = path.match(/\/stories\/([^/]+)\/?$/);
  return match?.[1] ?? '';
}

export function getStoryBySlug(slug: string): Story | null {
  return getStories('asc').find((story) => story.slug === slug) ?? null;
}

export function getAuthorsNotesHref(storySlug: string): string | null {
  const filepath = `../pages/authors-notes/${storySlug}.md`;
  return filepath in authorsNotesModules ? `/authors-notes/${storySlug}/` : null;
}

export function getStoryNeighbors(currentPath: string): {
  previous: Story | null;
  next: Story | null;
} {
  const stories = getStories('asc');
  const slug = pathToSlug(currentPath);
  const index = stories.findIndex((story) => story.slug === slug);

  if (index === -1) {
    return { previous: null, next: null };
  }

  return {
    previous: index > 0 ? stories[index - 1] : null,
    next: index < stories.length - 1 ? stories[index + 1] : null,
  };
}
