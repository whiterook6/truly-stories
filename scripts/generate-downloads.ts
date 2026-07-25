import { EPub } from "epub-gen-memory";
import matter from "gray-matter";
import { marked } from "marked";
import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { formatDate, toDateString } from "../src/utils/date.ts";

type Story = {
  slug: string;
  frontmatter: {
    title: string;
    publishDate: string | Date;
    author?: string;
    tags?: string[];
  };
  markdown: string;
  html: string;
};

const epubStyles = await readFile(
  path.join(import.meta.dirname, "epub-styles.css"),
  { encoding: "utf-8" },
);

const clearDirectory = async (directory: string) => {
  await mkdir(directory, { recursive: true });
  const files = await readdir(directory, {
    encoding: "utf-8",
  });
  await Promise.all(files.map(async (file) => {
    await unlink(path.join(directory, file));
  }));
};

const fetchStories = async (storyDirectory: string): Promise<Story[]> => {
  await mkdir(storyDirectory, { recursive: true });
  const files = (await readdir(storyDirectory, {
    encoding: "utf-8",
  })).filter((file) => file.endsWith(".md"));

  return Promise.all(files.map(async (file) => {
    const filePath = path.join(storyDirectory, file);
    return fetchStory(filePath);
  }));
};

const fetchStory = async (filePath: string): Promise<Story> => {
  const fileContent = await readFile(filePath, { encoding: "utf-8" });
  const { data, content: markdown } = matter(fileContent);
  const html = await marked(markdown);
  const slug = path.basename(filePath, ".md");

  return {
    slug,
    frontmatter: {
      title: data.title,
      publishDate: data.publishDate,
      author: data.author,
      tags: data.tags,
    },
    markdown,
    html,
  };
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const storyHeaderHtml = (story: Story): string => {
  const title = escapeHtml(story.frontmatter.title);
  const subtitle = escapeHtml(formatDate(story.frontmatter.publishDate));
  const datetime = toDateString(story.frontmatter.publishDate);

  return `<header>
  <h1 class="story-title">${title}</h1>
  <p class="story-subtitle"><time datetime="${datetime}">${subtitle}</time></p>
</header>
`;
};

const generateEPub = async (story: Story) => {
  const book = new EPub(
    {
      title: story.frontmatter.title,
      author: story.frontmatter.author ?? "Tim Graboski",
      date: toDateString(story.frontmatter.publishDate),
      lang: "en",
      css: epubStyles,
      prependChapterTitles: false,
      numberChaptersInTOC: false,
      tocTitle: story.frontmatter.title,
    },
    [
      {
        title: story.frontmatter.title,
        content: `${storyHeaderHtml(story)}${story.html}`,
      },
    ],
  );
  return book.genEpub();
};

const run = async () => {
  const downloadsDirectory = path.join(import.meta.dirname, "../public/downloads");
  await clearDirectory(downloadsDirectory);

  const storiesDirectory = path.join(import.meta.dirname, "../src/pages/stories");
  const stories = await fetchStories(storiesDirectory);
  await Promise.all(stories.map(async (story) => {
    const epubFile = await generateEPub(story);
    await writeFile(path.join(downloadsDirectory, `${story.slug}.epub`), epubFile);
    console.log(`Generated ${story.slug}.epub`);
  }));
};

run().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error("Error generating downloads:", error);
  process.exit(1);
});
