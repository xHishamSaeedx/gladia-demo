const LiveTranscriptionService = require("./liveTranscriptionService");
const fs = require("fs");
const path = require("path");

async function transcribeFile(filePath) {
  const service = new LiveTranscriptionService();

  try {
    // Log the absolute path to help debug
    const absolutePath = path.resolve(filePath);
    console.log(`Attempting to transcribe file at: ${absolutePath}`);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${absolutePath}`);
    }

    // Read the WAV file as a buffer
    const audioBuffer = fs.readFileSync(absolutePath);
    console.log(`File loaded: ${audioBuffer.length} bytes`);

    // Initialize the session
    const wsUrl = await service.initializeSession();
    console.log("Session initialized");

    // Setup WebSocket connection
    await service.setupWebSocket(wsUrl);

    // Send audio in chunks with proper timing
    const chunkSize = 1024 * 32; // 32KB chunks
    const delayBetweenChunks = 500; // 500ms between chunks

    for (let i = 0; i < audioBuffer.length; i += chunkSize) {
      const chunk = audioBuffer.slice(i, i + chunkSize);
      await service.sendAudioChunk(chunk);

      // Add delay between chunks to prevent overwhelming the service
      await new Promise((resolve) => setTimeout(resolve, delayBetweenChunks));
    }

    console.log("Finished sending audio chunks");

    // Signal end of audio
    await service.stopRecording();
    console.log("Audio processing complete");

    // Wait for final processing
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Get final transcription
    const transcription = service.getTranscription();
    console.log("\nFinal Transcription:");
    console.log("-------------------");
    console.log(transcription);
    console.log("-------------------");

    return transcription;
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
}

// Get the audio file path from command line argument
const audioFilePath = process.argv[2];

if (!audioFilePath) {
  console.error("Please provide the path to your WAV file:");
  console.log("npm start -- path/to/your/audio.wav");
  process.exit(1);
}

console.log("Current directory:", process.cwd());
console.log("Script directory:", __dirname);
console.log("Looking for file at:", audioFilePath);

if (!fs.existsSync(audioFilePath)) {
  console.error(`Error: File not found: ${audioFilePath}`);
  process.exit(1);
}

transcribeFile(audioFilePath)
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
