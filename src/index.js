/**
 * Telegram AI Bot — Cloudflare Worker
 * Models: Llama 3.3 70B (text) + Whisper Large V3 Turbo (voice)
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --- Health check ---
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(
        "🤖 Telegram AI Bot is running!\n\nModels:\n- Llama 3.3 70B (text chat)\n- Whisper Large V3 Turbo (voice transcription)",
        { headers: { "Content-Type": "text/plain; charset=utf-8" } }
      );
    }

    // --- Webhook endpoint ---
    if (url.pathname === "/webhook" && request.method === "POST") {
      // Verify Telegram secret token
      const secretToken = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
      if (secretToken !== env.TELEGRAM_WEBHOOK_SECRET_TOKEN) {
        return new Response("Unauthorized", { status: 401 });
      }

      const update = await request.json();
      const message = update.message;
      if (!message) return new Response("OK");

      const chatId = message.chat.id;

      // --- Text message → Llama 3.3 70B ---
      if (message.text) {
        try {
          const aiResponse = await env.AI.run("@cf/meta/llama-3.3-70b-instruct", {
            messages: [
              {
                role: "system",
                content:
                  "تو یک دستیار هوشمند فارسی‌زبان هستی. پاسخ‌های کوتاه، دقیق و مفید بده.",
              },
              { role: "user", content: message.text },
            ],
          });

          const replyText = aiResponse.response || "متأسفانه پاسخی دریافت نشد.";
          await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, replyText);
        } catch (error) {
          console.error("Text processing error:", error);
          await sendTelegramMessage(
            env.TELEGRAM_BOT_TOKEN,
            chatId,
            "❌ خطا در پردازش درخواست. لطفاً دوباره تلاش کنید."
          );
        }
        return new Response("OK");
      }

      // --- Voice message → Whisper → Llama 3.3 70B ---
      if (message.voice) {
        try {
          // Step 1: Get file path from Telegram
          const fileId = message.voice.file_id;
          const fileRes = await fetch(
            `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`
          );
          const fileData = await fileRes.json();
          if (!fileData.ok) throw new Error("getFile failed");

          // Step 2: Download audio file
          const filePath = fileData.result.file_path;
          const audioRes = await fetch(
            `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${filePath}`
          );
          const audioArrayBuffer = await audioRes.arrayBuffer();

          // Step 3: Whisper — transcribe audio to text
          const whisperResponse = await env.AI.run(
            "@cf/openai/whisper-large-v3-turbo",
            {
              audio: [...new Uint8Array(audioArrayBuffer)],
            }
          );
          const transcribedText = whisperResponse.text || "";

          if (!transcribedText.trim()) {
            await sendTelegramMessage(
              env.TELEGRAM_BOT_TOKEN,
              chatId,
              "❌ متأسفانه نتوانستم پیام صوتی شما را تشخیص دهم."
            );
            return new Response("OK");
          }

          // Step 4: Send transcribed text to user
          await sendTelegramMessage(
            env.TELEGRAM_BOT_TOKEN,
            chatId,
            `📝 متن پیام صوتی:\n\n${transcribedText}`
          );

          // Step 5: Llama 3.3 70B — generate AI response
          const aiResponse = await env.AI.run(
            "@cf/meta/llama-3.3-70b-instruct",
            {
              messages: [
                {
                  role: "system",
                  content:
                    "تو یک دستیار هوشمند فارسی‌زبان هستی. پاسخ‌های کوتاه، دقیق و مفید بده.",
                },
                { role: "user", content: transcribedText },
              ],
            }
          );

          const replyText = aiResponse.response || "متأسفانه پاسخی دریافت نشد.";
          await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, replyText);
        } catch (error) {
          console.error("Voice processing error:", error);
          await sendTelegramMessage(
            env.TELEGRAM_BOT_TOKEN,
            chatId,
            "❌ خطا در پردازش پیام صوتی. لطفاً دوباره تلاش کنید."
          );
        }
        return new Response("OK");
      }

      // --- Unsupported message type ---
      await sendTelegramMessage(
        env.TELEGRAM_BOT_TOKEN,
        chatId,
        "در حال حاضر فقط پیام‌های متنی 📝 و صوتی 🎤 پشتیبانی می‌شوند."
      );
      return new Response("OK");
    }

    return new Response("Not Found", { status: 404 });
  },
};

/**
 * Send a text message to a Telegram chat.
 * @param {string} token - Telegram bot token
 * @param {number} chatId - Telegram chat ID
 * @param {string} text - Message text to send
 */
async function sendTelegramMessage(token, chatId, text) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}
