import * as createDOMPurify from "dompurify";
import { parseHTML } from "linkedom";
import { extract, type FeedData, type FeedEntry } from "@extractus/feed-extractor";
import { Readability } from "@mozilla/readability";
import { feedSchema } from "../dtos/feed.dto";

export const FEED_ITEM_EXPIRE_TIME_IN_MS = 30 * 24 * 60 * 60 * 1000; // 2592000000 30 days

type URLObject = {
  __attributes: {
    "@_href": string;
  };
};

type ContentObjectType = {
  "#text"?: string;
};

type XMLFeedItemType = {
  title?: string | ContentObjectType;
  link?: string | URLObject;
  url?: string | URLObject;
  image?: string;
  imageUrl?: string;
  featuredImage?: string;
  description?: string | ContentObjectType;
  content?: string | ContentObjectType;
  summary?: string | ContentObjectType;
  pubDate?: string;
  updated?: string;
  guid: string;
  "media:content"?: {
    "media:keywords": string;
    __attributes: {
      "@_url": string;
      "@_medium": string;
    };
  }[];
  "media:thumbnail": {
    __attributes: {
      "@_url": string;
    };
  }[];
};

export async function fetchArticle(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch article: ${response.status}`);
  }
  const html = await response.text();
  const { document, window } = parseHTML(html);
  [...document.getElementsByTagName("img")].forEach(link => {
    link.src = new URL(link.src, url).href;
  });
  [...document.getElementsByTagName("a")].forEach(link => {
    link.href = new URL(link.href, url).href;
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener nofollow");
  });
  let reader: Readability | null = null;

  try {
    reader = new Readability(document);
  } catch (error) {
    console.error("Readability error", (error as Error).message, url);
  }

  let result: string | null = null;
  if (reader) {
    const article = reader?.parse();

    if (article?.content) {
      // const { window } = parseHTML("");
      const purify = createDOMPurify(window);

      result = purify.sanitize(article.content);
    }
  }
  return result;
}

export function getItemUrl(item: XMLFeedItemType) {
  const link = item.link || "";
  const url = item.url || "";
  if (!link && url) {
    return url;
  }
  if (typeof link === "object" && link["__attributes"] && link["__attributes"]["@_href"]) {
    return link["__attributes"]["@_href"];
  }
  return link;
}

export function getFeedImage(item: XMLFeedItemType) {
  let image = item.image || "";
  if (!image) {
    if (item.imageUrl) {
      image = item.imageUrl;
    }

    if (item.featuredImage) {
      image = item.featuredImage;
    }

    // engadget
    const itemMediaContent = item["media:content"];
    if (itemMediaContent && Array.isArray(itemMediaContent)) {
      for (const mediaContent of itemMediaContent) {
        const mediaKeywords = mediaContent["media:keywords"];
        const mediaContentAttr = mediaContent["__attributes"];
        if (mediaKeywords === "headline" && mediaContentAttr && mediaContentAttr["@_medium"] === "image") {
          image = mediaContentAttr["@_url"];
        }
      }
    }
  }
  return image;
}

export interface FeederFeedData extends FeedData {
  entries?: Array<
    FeedEntry & {
      id: string;
      feedId: string;
      image: string;
      isRead: boolean;
    }
  >;
}

async function fetchFeedContent(url: string) {
  const rawFeedData = await extract(
    url,
    {
      descriptionMaxLen: 0,
      getExtraFeedFields: _feedData => ({}),
      getExtraEntryFields: _entryData => {
        console.log({ _entryData });
        // return {};
        const image = getFeedImage(_entryData as unknown as XMLFeedItemType);
        //
        return {
          id: getItemUrl(_entryData as unknown as XMLFeedItemType),
          feedId: url,
          image,
          isRead: false,
        };
      },
    },
    {
      signal: AbortSignal.timeout(3000),
    },
  );

  // Explicitly cast the result to FeederFeedData
  return rawFeedData as FeederFeedData;
}

export async function getFeedItems(feedUrl: string) {
  const doc = await fetchFeedContent(feedUrl);

  return doc.entries || [];
}

export async function getFeedDetails(feedUrl: string) {
  const doc = await fetchFeedContent(feedUrl);

  const feed = feedSchema.parse({
    title: doc.title,
    xmlUrl: doc.link,
    htmlUrl: doc.link,
  });
  return { feed, feedItems: doc.entries };
}

/**
 * Sanitizes a given string id by replacing all non-alphanumeric characters with underscores
 * and removing any leading or trailing underscores.
 *
 * @param id the string to be sanitized
 * @returns the sanitized string
 */
export function safeId(id: string) {
  return id
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/(^_|_$)/, "");
}
