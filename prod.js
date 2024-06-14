import { Client } from "@xmtp/mls-client";
import { createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import { TextCodec } from "@xmtp/content-type-text";
import { toBytes } from "viem";

async function main(key) {
  if (!key) throw new Error("Key is required");

  const account = privateKeyToAccount(key);
  console.log(account.address);
  const wallet = createWalletClient({
    account,
    chain: mainnet,
    transport: http(),
  });
  const client = await Client.create(account.address, {
    env: "production",
    apiUrl: "https://grpc.production.xmtp.network:443",
    dbPath: "./db/db",
    codecs: [new TextCodec()],
  });
  if (!client.isRegistered) {
    const signature = toBytes(
      await wallet.signMessage({
        message: client.signatureText,
      }),
    );
    client.addEcdsaSignature(signature);
    await client.registerIdentity();
  }

  await client.conversations.sync();
  const conversations = await client.conversations.list();

  console.log(conversations.length);
  for (const conv of conversations) {
    console.log(conv.id);
    await conv.send("gm", {
      contentType: TextCodec,
    });
    const messages = await conv.messages();
    const messages2 = await conv.messages;
    console.log(messages.length, messages[0], messages2[0]);
  }
}

main("0x92e62485dcfa56dfade8ff7da576e4b92a8125108835b696aff4a9dbcd7a3851");
