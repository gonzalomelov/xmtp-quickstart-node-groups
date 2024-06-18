import "dotenv/config";
import { Client } from "@xmtp/mls-client";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import { ContentTypeText } from "@xmtp/content-type-text";
import { toBytes } from "viem";

// Function to send a message to a specific group
async function sendMessageToGroup(client, groupId, messageContent) {
  const conversation = client.conversations.get(groupId);
  if (!conversation) {
    console.log(`No conversation found with ID: ${groupId}`);
    return;
  }
  await conversation.send(messageContent, ContentTypeText);
  console.log(`Message sent to group ${groupId}: ${messageContent}`);
}

// Function to create a wallet from a private key
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
async function setupClient(wallet, dbPath, config) {
  let initialConfig = {
    env: process.env.XMTP_ENV,
    dbPath: dbPath,
  };
  const finalConfig = { ...initialConfig, ...config };

  const client = await Client.create(
    wallet.address ? wallet.address : wallet.account?.address,
    finalConfig,
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
    const messages = await conv.messages();
    console.log(`Total messages in conversation: ${messages.length}`);
    for (let i = 0; i < messages.length; i++) {
      console.log(`Message ${i}: ${messages[i].content}`);
    }
  }
}
// Function to stream all messages and respond to new ones
async function streamAndRespond(client) {
  console.log("Started streaming messages");
  const stream = await client.conversations.streamAllMessages();
  for await (const message of stream) {
    console.log(`Streamed message: ${message.content}`);
    if (message.senderInboxId !== client.inboxId) {
      sendMessageToGroup(client, message.conversationId, "gm");
    }
  }
}

// Main function to run the application
async function main() {
  // Create a new wallet instance
  const wallet = await createWallet();
  // Set up the XMTP client with the wallet and database path
  const client = await setupClient(wallet, `./db/test`, config);
  // Register the client with the XMTP network if not already registered
  await registerClient(client, wallet);
  // Handle existing conversations
  handleConversations(client);

  // Run message streaming in a parallel thread to respond to new messages
  (async () => {
    await streamAndRespond(client);
  })();
}
// Example usage
main();
