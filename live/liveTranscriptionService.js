const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
require("dotenv").config({ path: path.join(__dirname, ".env") });

class LiveTranscriptionService {
  constructor() {
    if (!process.env.GLADIA_API_KEY) {
      throw new Error("GLADIA_API_KEY not found in environment variables");
    }
    this.apiKey = process.env.GLADIA_API_KEY;
    this.baseUrl = "https://api.gladia.io/v2/live";
    this.socket = null;
    this.sessionId = null;
    this.transcription = "";
  }

  async initializeSession() {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Gladia-Key": this.apiKey,
        },
        body: JSON.stringify({
          encoding: "wav/pcm",
          sample_rate: 16000,
          bit_depth: 16,
          channels: 1,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `${response.status}: ${
            (await response.text()) || response.statusText
          }`
        );
      }

      const { id, url } = await response.json();
      this.sessionId = id;
      return url;
    } catch (error) {
      console.error("Failed to initialize session:", error);
      throw error;
    }
  }

  setupWebSocket(url) {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(url);

      this.socket.on("open", () => {
        console.log("WebSocket connection established");
        resolve();
      });

      this.socket.on("error", (error) => {
        console.error("WebSocket error:", error);
        reject(error);
      });

      this.socket.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "transcript" && message.data.is_final) {
          this.transcription += message.data.utterance.text + " ";
          console.log(`Partial transcript: ${message.data.utterance.text}`);
        }
      });

      this.socket.on("close", ({ code, reason }) => {
        console.log(`WebSocket closed with code ${code}. Reason: ${reason}`);
      });
    });
  }

  async sendAudioChunk(chunk) {
    if (!this.socket) throw new Error("WebSocket not initialized");

    return new Promise((resolve, reject) => {
      this.socket.send(chunk, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  async stopRecording() {
    if (!this.socket) throw new Error("WebSocket not initialized");

    this.socket.send(
      JSON.stringify({
        type: "stop_recording",
      })
    );
  }

  async getFinalResults() {
    if (!this.sessionId) throw new Error("No active session");

    const response = await fetch(`${this.baseUrl}/${this.sessionId}`, {
      method: "GET",
      headers: {
        "X-Gladia-Key": this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(
        `${response.status}: ${(await response.text()) || response.statusText}`
      );
    }

    return await response.json();
  }

  getTranscription() {
    return this.transcription.trim();
  }
}

module.exports = LiveTranscriptionService;
