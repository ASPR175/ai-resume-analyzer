import { headers } from "next/headers";
import { Webhook } from "svix";

import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.text();

  const headersList = await headers();

  const svixId = headersList.get("svix-id");
  const svixTimestamp = headersList.get("svix-timestamp");
  const svixSignature = headersList.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", {
      status: 400,
    });
  }

  const webhook = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);

  let event: Record<string, any>;

  try {
    event = webhook.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as Record<string, any>;
  } catch (error) {
    console.error("Webhook verification failed:", error);

    return new Response("Invalid signature", {
      status: 400,
    });
  }

  const eventType = event.type;

  try {
    switch (eventType) {
      case "user.created": {
        const user = event.data;

        const email =
          user.email_addresses?.[0]?.email_address ?? "";

        await prisma.user.upsert({
          where: {
            id: user.id,
          },
          update: {
            email,
          },
          create: {
            id: user.id,
            email,
            credits: 0,
          },
        });

        break;
      }

      case "user.updated": {
        const user = event.data;

        const email =
          user.email_addresses?.[0]?.email_address ?? "";

        // await prisma.user.update({
        //   where: {
        //     id: user.id,
        //   },
        //   data: {
        //     email,
        //   },
        // });
        await prisma.user.upsert({
  where: {
    id: user.id,
  },
  update: {
    email,
  },
  create: {
    id: user.id,
    email,
  },
});

        break;
      }

      case "user.deleted": {
        const userId = event.data?.id;

        if (userId) {
          await prisma.user.delete({
            where: {
              id: userId,
            },
          });
        }

        break;
      }

      default:
        break;
    }

    return new Response("Webhook processed", {
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);

    return new Response("Webhook processing failed", {
      status: 500,
    });
  }
}