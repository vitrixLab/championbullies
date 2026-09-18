type GHLContactResponse = {
  contact?: {
    id?: string;
  };
  id?: string;
};

type GHLOpportunityResponse = {
  opportunity?: {
    id?: string;
  };
  id?: string;
};

type GHLNoteResponse = {
  note?: {
    id?: string;
  };
};

export class GHLConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GHLConfigurationError";
  }
}

export class GHLRequestError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`GHL request failed with status ${status}`);
    this.name = "GHLRequestError";
    this.status = status;
  }
}

const DEFAULT_GHL_BASE_URL = "https://services.leadconnectorhq.com";
const DEFAULT_GHL_API_VERSION = "v3";
const GHL_TIMEOUT_MS = 8_000;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new GHLConfigurationError(`Missing ${name}`);
  }

  return value;
}

function getGHLConfig() {
  return {
    baseUrl:
      process.env.GHL_BASE_URL?.trim().replace(/\\/+$/, "") ||
      DEFAULT_GHL_BASE_URL,
    apiVersion:
      process.env.GHL_API_VERSION?.trim() || DEFAULT_GHL_API_VERSION,
    apiKey: requiredEnv("GHL_API_KEY"),
    locationId: requiredEnv("GHL_LOCATION_ID"),
  };
}

async function requestGHL<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const config = getGHLConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GHL_TIMEOUT_MS);

  try {
    let response: Response;

    try {
      response = await fetch(`${config.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
          Version: config.apiVersion,
          ...init.headers,
        },
        cache: "no-store",
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new GHLRequestError(504);
      }
      throw new GHLRequestError(503);
    }

    if (!response.ok) {
      throw new GHLRequestError(response.status);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new GHLRequestError(502);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function upsertGHLContact(input: {
  name: string;
  email: string;
  phone: string;
  tags: string[];
  source: string;
}) {
  const config = getGHLConfig();
  const nameParts = input.name.trim().split(/\\s+/);
  const firstName = nameParts.shift() || "";
  const lastName = nameParts.join(" ");

  const response = await requestGHL<GHLContactResponse>(
    "/contacts/upsert",
    {
      method: "POST",
      body: JSON.stringify({
        firstName,
        lastName,
        name: input.name.trim(),
        email: input.email,
        phone: input.phone || undefined,
        locationId: config.locationId,
        tags: input.tags,
        source: input.source,
        createNewIfDuplicateAllowed: false,
      }),
    },
  );

  const contactId = response.contact?.id || response.id;

  if (!contactId) {
    throw new GHLRequestError(502);
  }

  return {
    contactId,
    created: response.contact ? true : false,
  };
}

export async function createGHLContactNote(input: {
  contactId: string;
  title: string;
  body: string;
}) {
  const response = await requestGHL<GHLNoteResponse>(
    `/contacts/${encodeURIComponent(input.contactId)}/notes`,
    {
      method: "POST",
      body: JSON.stringify({
        title: input.title,
        body: input.body,
        pinned: false,
      }),
    },
  );

  return response.note?.id || null;
}

export async function createGHLOpportunity(input: {
  contactId: string;
  name: string;
  pipelineId: string;
  pipelineStageId: string;
}) {
  const config = getGHLConfig();

  const response = await requestGHL<GHLOpportunityResponse>(
    "/opportunities/",
    {
      method: "POST",
      body: JSON.stringify({
        pipelineId: input.pipelineId,
        locationId: config.locationId,
        name: input.name,
        pipelineStageId: input.pipelineStageId,
        status: "open",
        contactId: input.contactId,
      }),
    },
  );

  return response.opportunity?.id || response.id || null;
}
