import matter from "gray-matter";
import path from "node:path";
import { readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { marked } from "marked";
import { EPub } from "epub-gen-memory";

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

const clearDirectory = async (directory: string) => {
  const files = await readdir(directory, {
    encoding: "utf-8",
  });
  await Promise.all(files.map(async (file) => {
    await unlink(path.join(directory, file));
  }));
}

const fetchStories = async (storyDirectory: string): Promise<Story[]> => {
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

const generateEPub = async (story: Story) => {
  const book = new EPub(
    {
      title: story.frontmatter.title,
      author: story.frontmatter.author,
      prependChapterTitles: false, // don’t repeat the title above the body
      numberChaptersInTOC: false,
      tocTitle: story.frontmatter.title, // or whatever label you prefer  
    },
    [
      {
        title: story.frontmatter.title,
        content: story.html,
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
  }));
};

run();

