import "dotenv/config";
import { Client } from "@xmtp/mls-client";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import { ContentTypeText } from "@xmtp/content-type-text";
import { toBytes } from "viem";

async function createWallet() {
  let key = process.env.KEY;
  if (!key) throw new Error("Key is required");

  const account = privateKeyToAccount(key);
  const wallet = createWalletClient({
    account,
    chain: mainnet,
    transport: http(),
  });
  return wallet;
}

// Function to create and setup the XMTP client
async function setupClient(wallet, dbPath) {
  const client = await Client.create(
    wallet.address ? wallet.address : wallet.account?.address,
    {
      env: process.env.XMTP_ENV,
      dbPath: dbPath,
    },
  );
  return client;
}

// Function to register the client if not already registered
async function registerClient(client, wallet) {
  if (!client.isRegistered) {
    const signature = toBytes(
      await wallet.signMessage({
        message: client.signatureText,
      }),
    );
    client.addEcdsaSignature(signature);
    await client.registerIdentity();
  }
}

// Function to handle conversations
async function handleConversations(client) {
  await client.conversations.sync();
  const conversations = await client.conversations.list();
  console.log(`Total conversations: ${conversations.length}`);
  for (const conv of conversations) {
    console.log(`Handling conversation with ID: ${conv.id}`);
    await conv.sync();
    //await conv.send("Hello", ContentTypeText);

    const messages = await conv.messages();
    console.log(`Total messages in conversation: ${messages.length}`);
    for (let i = 0; i < messages.length; i++) {
      console.log(`Message ${i}: ${messages[i].content}`);
    }
  }
}

// Main function to run the application
async function main() {
  const wallet = await createWallet();
  const client = await setupClient(wallet, `./db/test`);
  await registerClient(client, wallet);
  handleConversations(client);

  // Run message streaming in a parallel thread
  (async () => {
    const stream = await client.conversations.streamAllMessages();
    for await (const message of stream) {
      console.log(`Streamed message: ${message.content}`);
    }
  })();
}

// Example usage
main(true);
