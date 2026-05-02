import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext } from "../../types";

export class AdminUploadLogo extends OpenAPIRoute {
  schema = {
    tags: ["Admin"],
    summary: "Upload a school logo",
    request: {
      body: {
        content: {
          "multipart/form-data": {
            schema: z.object({
              file: z.string().describe("Logo image file (binary)"),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Logo uploaded successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              logoUrl: z.string(),
            }),
          },
        },
      },
      "400": {
        description: "No file provided",
        content: {
          "application/json": {
            schema: z.object({ success: z.boolean(), error: z.string() }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const formData = await c.req.raw.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return c.json({ success: false, error: "No file provided" }, 400);
    }

    const ext = file.name.split(".").pop() ?? "png";
    const key = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    await c.env.BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type || "image/png" },
    });

    const origin = new URL(c.req.url).origin;
    return c.json({ success: true, logoUrl: `${origin}/assets/logos/${key}` });
  }
}
