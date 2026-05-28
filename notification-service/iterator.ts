import { createClient } from "redis";
const receivingClient = await createClient().connect();
const sendingClient = await createClient().connect();
import { renderTemplate, type TemplateName } from "./template/index";
import { prisma } from "./db";

type receiving = {
  id: number;
  user: string;
  template: TemplateName;
  service: "EMAIL";
  priority: 0 | 1 | 2;
};

export type sendingData = {
  to: string;
  from: string;
  template: string;
};

const processData = async (data: receiving) => {
  try {
    const userDetails = await prisma.user.findFirst({
      where: { id: data.user },
    });
    if (!userDetails) throw Error("failed to find the user");
    let templateDetails;
    if (data.template == "signup-success") {
      templateDetails = {
        username: userDetails.email,
      };
    } else if ((data.template = "wallet-onramp-success")) {
      templateDetails = {
        username: userDetails.email,
        amount: 150,
      };
    } else if ((data.template = "marketing-email")) {
      templateDetails = {
        title: "festival",
        username: userDetails.email,
        message: "please check it out",
      };
    }
    const template = await renderTemplate({
      template: data.template,
      variables: templateDetails!,
    });
    return {
      to: userDetails.email,
      from: process.env.email,
      template: template,
    } as sendingData;
  } catch (e) {
    console.log(e);
  }
};

const sendToRespectingQ = async (data: receiving, sendingData: sendingData) => {
  try {
    let q = "p0";
    if (data.priority == 1) q = "p1";
    else if (data.priority == 2) q = "p2";
    await sendingClient.lPush(q, JSON.stringify(sendingData));
  } catch (e) {
    console.log(e);
  }
};

while (true) {
  const received = await receivingClient.brPop("iterator", 0);
  const data: receiving = JSON.parse(received?.element!);
  console.log(data, "at iterator");
  const sendingData = await processData(data);
  await sendToRespectingQ(data, sendingData!);
}
