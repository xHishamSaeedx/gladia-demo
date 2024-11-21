import fs from "fs";
import WebSocket from "ws";

const API_KEY = "3611ced9-2388-4bbe-b707-8970580e2a09";

async function main() {
  // Read the audio file
  const audioFilePath = "./sample4.wav";
  const audioBuffer = fs.readFileSync(audioFilePath);

  // Step 1: Initialize the session
  const initResponse = await fetch("https://api.gladia.io/v2/live", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Gladia-Key": API_KEY,
    },
    body: JSON.stringify({
      encoding: "wav/pcm",
      sample_rate: 44100,
      bit_depth: 16,
      channels: 1,
      language_config: {
        languages: [], // You can now specify the expected languages in V2 as guidance to improve accuracy and latency
        code_switching: true,
      },
      pre_processing: { audio_enhancer: true },
      endpointing: 10,
    }),
  });

  if (!initResponse.ok) {
    console.error(
      `${initResponse.status}: ${
        (await initResponse.text()) || initResponse.statusText
      }`
    );
    process.exit(initResponse.status);
  }

  const { id, url } = await initResponse.json();
  console.log("Session initialized:", { id, url });

  // Step 2: Connect WebSocket
  const socket = new WebSocket(url);

  socket.addEventListener("open", function () {
    console.log("WebSocket connected, sending audio chunks...");
    // Send audio in chunks
    const CHUNK_SIZE = 4096; // Smaller chunk size for more frequent updates
    for (let offset = 0; offset < audioBuffer.length; offset += CHUNK_SIZE) {
      const chunk = audioBuffer.slice(offset, offset + CHUNK_SIZE);
      socket.send(
        JSON.stringify({
          type: "audio_chunk",
          data: {
            chunk: chunk.toString("base64"),
          },
        })
      );
    }

    // Signal end of audio
    console.log("Finished sending chunks, stopping recording...");
    socket.send(
      JSON.stringify({
        type: "stop_recording",
      })
    );
  });

  socket.addEventListener("error", function (error) {
    console.error("WebSocket Error:", error);
  });

  socket.addEventListener("close", function ({ code, reason }) {
    console.log(`WebSocket closed with code ${code}`, reason);
  });

  socket.addEventListener("message", function (event) {
    const message = JSON.parse(event.data.toString());

    if (message.type === "transcript") {
      if (message.data.is_final) {
        console.log(
          `Final transcript ${message.data.id}: ${message.data.utterance.text}`
        );
      } else {
        console.log(`Partial transcript: ${message.data.utterance.text}`);
      }
    }
  });

  // Wait for processing to complete
  await new Promise((resolve) => {
    setTimeout(() => {
      socket.close(1000);
      resolve();
    }, 5000); // Give some time for processing
  });

  // Step 3: Get final results
  console.log("Fetching final results...");
  const resultResponse = await fetch(`https://api.gladia.io/v2/live/${id}`, {
    method: "GET",
    headers: {
      "X-Gladia-Key": API_KEY,
    },
  });

  if (!resultResponse.ok) {
    console.error(
      `${resultResponse.status}: ${
        (await resultResponse.text()) || resultResponse.statusText
      }`
    );
    return;
  }

  const result = await resultResponse.json();
  console.log("Final Result:", result);
}

main().catch((error) => {
  console.error("Main process error:", error);
  process.exit(1);
});
