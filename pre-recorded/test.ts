import dotenv from "dotenv";
import path from "path";

// Configure dotenv
dotenv.config({ path: path.resolve(__dirname, ".env") });

async function makeFetchRequest(url: string, options: any) {
  const response = await fetch(url, options);
  return response.json();
}

async function pollForResult(resultUrl: string, headers: any) {
  while (true) {
    console.log("Polling for results...");
    const pollResponse = await makeFetchRequest(resultUrl, { headers });

    if (pollResponse.status === "done") {
      console.log("- Transcription done: \n");

      // Log the detected language
      const detectedLanguage = pollResponse.result.language;
      console.log(`Detected language: ${detectedLanguage}`);

      // Log the transcription
      const transcription = pollResponse.result.transcription;
      console.log("\nTranscription:");
      console.log(transcription);
      break;
    } else {
      console.log("Transcription status : ", pollResponse.status);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

async function startTranscription() {
  const gladiaKey = process.env.GLADIA_API_KEY;

  if (!gladiaKey) {
    throw new Error("GLADIA_API_KEY is not set in environment variables");
  }

  const requestData = {
    audio_url:
      "https://storage.googleapis.com/elevenlab/ElevenLabs_2024-11-21T12_28_53_Adam%20Stone%20-%20late%20night%20radio_pvc_s80_sb98_m1.mp3",
    enable_code_switching: true, // Enable detection of language switches
    code_switching_config: {
      languages: [], // Empty array means detect any language
    },
    translation: false, // Disable translation since we only want the original
    diarization: false, // Disable other features we don't need
    subtitles: false,
    summarization: false,
  };

  const gladiaUrl = "https://api.gladia.io/v2/pre-recorded/";
  const headers = {
    "x-gladia-key": gladiaKey,
    "Content-Type": "application/json",
  };

  console.log("- Sending initial request to Gladia API...");
  const initialResponse = await makeFetchRequest(gladiaUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(requestData),
  });

  console.log("Initial response with Transcription ID :", initialResponse);

  if (initialResponse.result_url) {
    await pollForResult(initialResponse.result_url, headers);
  }
}

startTranscription();
