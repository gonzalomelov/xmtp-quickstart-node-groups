import { Wallet } from "ethers";
import { Client } from "@xmtp/mls-client";

async function main(key = null) {
  if (!key) key = Wallet.createRandom().privateKey;
  const wallet = new Wallet(key);
  const client = await Client.create(await wallet.getAddress(), {
    env: "dev",
    dbPath: "./db",
  });
  let object = {
    privateKey: key,
    accountAddress: client.accountAddress,
    conversations: await client.conversations.list(),
    inboxId: client.inboxId,
    installationId: client.installationId,
  };
  console.log(object);

  await client.conversations.sync();
  const conversations = await client.conversations.list();
  console.log(conversations);

  for (const conv of conversations) {
    console.log(conv.id);
  }
  return client;
}
const client = await main(
  "0x92e62485dcfa56dfade8ff7da576e4b92a8125108835b696aff4a9dbcd7a3851",
);
//0xC2b5d616995014a027576671BcF346234fd8a4ab
//0x23C37195777532e16aC4a7ccF1611452cd1f24c4
