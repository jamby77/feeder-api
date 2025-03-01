import { X2jOptions, XMLBuilder, XMLParser } from "fast-xml-parser";
import { FeedItemDto, feedItemSchema } from "../dtos/feed-item.dto";
import { FeedDto } from "../dtos/feed.dto";

type URLObject = {
  __attributes: {
    "@_href": string;
  };
};

type ContentObjectType = {
  "#text"?: string;
};

type XMLFeedItemType = {
  title?: string;
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

async function fetchFeedContent(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${response.status}`);
  }
  return response.text();
}

function parseFeedXml(xml: string): XMLFeedType {
  const parserOptions: X2jOptions = {
    ignoreAttributes: false,
    stopNodes: ["feed.entry.content"],
    allowBooleanAttributes: true,
    attributesGroupName: "__attributes",
    parseAttributeValue: true,
    parseTagValue: true,
    ignoreDeclaration: true,
  };
  const parser = new XMLParser(parserOptions);
  return parser.parse(xml) as XMLFeedType;
}

export function buildFeedsExportData(feeds: FeedDto[]) {
  const outline: Record<string, any> = {};

  for (const { htmlUrl, title, xmlUrl, categories } of feeds) {
    const outlineItem = {
      type: "rss",
      text: title,
      title,
      xmlUrl,
      htmlUrl,
    };
    if (categories && categories.length > 0) {
      for (const c of categories) {
        if (!outline[c]) {
          outline[c] = {
            type: "category",
            title: c,
            text: c,
            outline: [],
          };
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        outline[c].outline.push(outlineItem);
      }
    } else {
      outline[title] = outlineItem;
    }
  }

  return {
    head: {
      title: "Feeder - Export",
    },
    body: {
      outline: Object.values(outline),
    },
  };
}

export function buildFeedsOPMLXml(feeds: FeedDto[]): any {
  const options = {
    ignoreAttributes: false,
    allowBooleanAttributes: true,
    suppressBooleanAttributes: true,
    attributesGroupName: "__attributes",
    format: true,
    arrayNodeName: "outline",
    suppressUnpairedNodes: false,
  };
  const builder = new XMLBuilder(options);
  const outline: Record<string, any> = {};

  for (const { htmlUrl, title, xmlUrl, categories } of feeds) {
    const outlineItem = {
      __attributes: {
        type: "rss",
        text: title,
        title,
        xmlUrl,
        htmlUrl,
      },
    };
    if (categories && categories.length > 0) {
      for (const c of categories) {
        if (!outline[c]) {
          outline[c] = {
            __attributes: {
              title: c,
              text: c,
            },
            outline: [],
          };
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        outline[c].outline.push(outlineItem);
      }
    } else {
      outline[title] = outlineItem;
    }
  }

  const data = {
    "?xml": {
      __attributes: {
        version: "1.0",
        encoding: "UTF-8",
      },
    },
    opml: {
      __attributes: {
        version: "1.1",
      },
      head: {
        title: "Feeder - Export",
      },
      body: {
        outline: Object.values(outline),
      },
    },
  };
  return builder.build(data);
}

function getFeedItemDate(item: XMLFeedItemType) {
  if (!item) {
    return new Date();
  }
  let pubDateStr: string = item.pubDate ?? "";
  if (!pubDateStr && item.updated) {
    // atom (vercel)
    pubDateStr = item.updated;
  }
  return pubDateStr.trim().length > 0 ? new Date(pubDateStr) : new Date();
}

export function getFeedItemContent(item: XMLFeedItemType): string {
  let description = item.description || "";
  if (description && typeof description === "object" && description["#text"]) {
    description = description["#text"].trim();
  } else if (item.content && typeof item.content === "object" && item.content["#text"]) {
    description = item.content["#text"].trim();
  } else if (item.summary && typeof item.summary === "object" && item.summary["#text"]) {
    description = item.summary["#text"].trim();
  }
  return description as string;
}

function buildFeedItem(feedId: string, item: XMLFeedItemType): FeedItemDto {
  const title = item.title || "";

  const image = getFeedImage(item);
  const description = getFeedItemContent(item);
  const link = getItemUrl(item);
  const pubDate = getFeedItemDate(item);
  const data = {
    id: link,
    feedId,
    title,
    description,
    pubDate,
    link,
    image,
    isRead: false,
  };

  const { error, data: feedItem } = feedItemSchema.safeParse(data);

  if (error || !feedItem) {
    console.error({ error: JSON.stringify(error, null, 2), data });
    return {} as unknown as FeedItemDto;
  }
  for (const field in item) {
    if (!(field in feedItem)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      feedItem[field] = item[field];
    }
  }

  return feedItem;
}
function extractFeedItems(doc: XMLFeedType): XMLFeedItemType[] | undefined {
  let itemsNodes: XMLFeedItemType[] | undefined = doc?.rss?.channel?.item ?? doc?.rdf?.channel?.item;
  console.log({ itemsNodes });
  if (!itemsNodes) {
    itemsNodes = doc?.feed?.entry;
  }
  return itemsNodes;
}

type XMLFeedType = {
  rss?: {
    channel?: { link?: string; title?: string; item?: XMLFeedItemType[] };
  };
  rdf?: {
    channel?: { link?: string; title?: string; item?: XMLFeedItemType[] };
  };
  feed?: { link?: string; title?: string; entry?: XMLFeedItemType[] };
};

function getFeedTitle(doc: XMLFeedType): string {
  return doc?.rss?.channel?.title || doc?.rdf?.channel?.title || doc?.feed?.title || "";
}

function getHtmlUrl(doc: XMLFeedType): string {
  return doc?.rss?.channel?.link || doc?.rdf?.channel?.link || doc?.feed?.link || "";
}

export async function getFeedItems(feedUrl: string) {
  const xml = await fetchFeedContent(feedUrl);

  const doc = parseFeedXml(xml);
  const itemsNodes = extractFeedItems(doc) || [];
  return itemsNodes.map(item => buildFeedItem(feedUrl, item));
}
export async function getFeedDetails(feedUrl: string) {
  const xml = await fetchFeedContent(feedUrl);

  const doc = parseFeedXml(xml);
  const itemsNodes = extractFeedItems(doc) || [];
  return {
    title: getFeedTitle(doc),
    xmlUrl: feedUrl,
    htmlUrl: getHtmlUrl(doc),
    items: itemsNodes.map(item => buildFeedItem(feedUrl, item)),
  };
}
