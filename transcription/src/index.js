import fetch from "node-fetch";
import fs from "fs";
import FormData from "form-data";
import dotenv from "dotenv";

dotenv.config();

const GLADIA_API_KEY = "b27946cb-83d6-4ca2-858a-3e8a5bbed78b";

async function uploadAudio(filePath) {
  try {
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));

    const response = await fetch("https://file.io", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      console.error(
        "Error uploading file:",
        response.status,
        await response.text()
      );
      return null;
    }

    const result = await response.json();
    console.log(`Audio file uploaded successfully: ${result.link}`);
    return result.link;
  } catch (error) {
    console.error("Error during file upload:", error);
    return null;
  }
}

async function initiateTranscription(audioUrl) {
  try {
    const options = {
      method: "POST",
      headers: {
        "x-gladia-key": GLADIA_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        detect_language: true,
        language: "en",
        subtitles: false,
        diarization: false,
        summarization: false,
      }),
    };

    const response = await fetch(
      "https://api.gladia.io/v2/transcription",
      options
    );

    if (!response.ok) {
      console.error(
        "Error initiating transcription:",
        response.status,
        await response.text()
      );
      return null;
    }

    const result = await response.json();
    console.log("Transcription job initiated successfully:");
    console.log(`Job ID: ${result.id}`);
    return result.id;
  } catch (error) {
    console.error("Error initiating transcription:", error);
    return null;
  }
}

async function fetchTranscriptionResult(jobId) {
  try {
    const options = {
      method: "GET",
      headers: {
        "x-gladia-key": GLADIA_API_KEY,
      },
    };

    const response = await fetch(
      `https://api.gladia.io/v2/transcription/${jobId}`,
      options
    );

    if (!response.ok) {
      console.error(
        "Error fetching transcription result:",
        response.status,
        await response.text()
      );
      return null;
    }

    const result = await response.json();
    console.log("Transcription result retrieved successfully:");
    console.log(result.transcription); // Display the actual transcription
  } catch (error) {
    console.error("Error fetching transcription result:", error);
  }
}

async function main() {
  const audioFilePath = "./sample3.wav";

  if (!fs.existsSync(audioFilePath)) {
    console.error(`File not found: ${audioFilePath}`);
    return;
  }

  console.log("Uploading audio file...");
  const audioUrl = await uploadAudio(audioFilePath);

  if (audioUrl) {
    console.log("Initiating transcription job...");
    const jobId = await initiateTranscription(audioUrl);

    if (jobId) {
      console.log("Fetching transcription result...");
      await fetchTranscriptionResult(jobId);
    }
  }
}

main();
