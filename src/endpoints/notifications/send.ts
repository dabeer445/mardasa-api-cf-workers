import { Bool, OpenAPIRoute, Str, Num } from "chanfana";
import { z } from "zod";
import { type AppContext } from "../../types";
import { createWhatsAppService } from "../../services/whatsapp";

export class NotificationSend extends OpenAPIRoute {
  schema = {
    tags: ["Notifications"],
    summary: "Send WhatsApp notification to one or more phone numbers",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              phones: z.union([
                z.string(),
                z.array(z.string()),
              ]).describe("Single phone number or array of phone numbers"),
              message: Str({ description: "Message to send" }),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Notification sent",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: z.object({
                total: Num(),
                sent: Num(),
                failed: Num(),
              }),
            }),
          },
        },
      },
      "400": {
        description: "Invalid request",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              error: Str(),
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const { phones, message } = data.body;

    if (!message || message.trim() === '') {
      return c.json({ success: false, error: "Message cannot be empty" }, 400);
    }

    const phoneList = Array.isArray(phones) ? phones : [phones];

    if (phoneList.length === 0) {
      return c.json({ success: false, error: "At least one phone number is required" }, 400);
    }

    const whatsapp = createWhatsAppService(c.env);
    const result = await whatsapp.sendToMultiple(phoneList, message);

    return {
      success: result.sent > 0,
      result,
    };
  }
}
