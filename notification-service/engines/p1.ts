import { createClient } from "redis";
import { type sendingData } from "../iterator";
import { Resend } from "resend";

let default_url = "re_WaWe54Ve_5WaRoqtrRcnHdAz96K4SC37P";
const resend = new Resend(process.env.resend_api_url ?? default_url); // process.env was not working for now

const client = await createClient().connect();

const sendEmailWithDetails = async (sending: sendingData) => {
  const { data, error } = await resend.emails.send({
    from: 'Acme <onboarding@resend.dev>',
    to: sending.to,
    subject: 'hi there',
    html: sending.template
  });
  console.log(error);
  return data ? 1 : 0;
}

while (true)
{
  const received = await client.brPop("p1", 0);
  const data = JSON.parse(received?.element!) as sendingData;
  console.log(data, "at p1");
  const sentEmail = await sendEmailWithDetails(data);
  if (!sentEmail) console.log("problem in sending email in p1");
  else console.log("done!!, check the email");
}