import fs from "fs"; // To read the audio file
import WebSocket from "ws"; // WebSocket library
import fetch from "node-fetch"; // To make HTTP requests

async function main() {
  const API_KEY = "3611ced9-2388-4bbe-b707-8970580e2a09";
  const AUDIO_FILE_PATH = "./sample3.wav"; // Path to your local audio file

  // Step 1: Initiate the real-time session
  const response = await fetch("https://api.gladia.io/v2/live", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Gladia-Key": API_KEY,
    },
    body: JSON.stringify({
      encoding: "wav/pcm",
      sample_rate: 16000,
      bit_depth: 16,
      channels: 1,
    }),
  });

  if (!response.ok) {
    console.error(
      `${response.status}: ${(await response.text()) || response.statusText}`
    );
    process.exit(response.status);
  }

  const { id, url } = await response.json();
  console.log(`Session started with ID: ${id}`);

  // Step 2: Connect to the WebSocket
  const socket = new WebSocket(url);

  socket.addEventListener("open", async function () {
    console.log("WebSocket connection opened.");

    // Step 3: Stream the audio file in chunks
    const readStream = fs.createReadStream(AUDIO_FILE_PATH, {
      highWaterMark: 1024,
    }); // 1 KB chunks
    for await (const chunk of readStream) {
      socket.send(chunk);
    }
    console.log("Audio file sent.");

    // Step 4: Signal the server to stop recording
    socket.send(JSON.stringify({ type: "stop_recording" }));
  });

  socket.addEventListener("message", function (event) {
    // Parse and handle server messages
    const message = JSON.parse(event.data.toString());
    if (message.type === "transcript" && message.data.is_final) {
      console.log(
        `Transcript (${message.data.id}): ${message.data.utterance.text}`
      );
    }
  });

  socket.addEventListener("error", function (error) {
    console.error("WebSocket error:", error);
  });

  socket.addEventListener("close", function ({ code, reason }) {
    console.log(
      `WebSocket connection closed. Code: ${code}, Reason: ${reason}`
    );
    if (code !== 1000) {
      console.warn("Unexpected closure. You may need to reconnect.");
    }
  });
}

main().catch((error) => console.error("Error:", error));
