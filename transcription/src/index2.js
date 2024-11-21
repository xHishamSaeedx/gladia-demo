require("dotenv").config();

async function transcribeAndCheck() {
  const requestBody = {
    enable_code_switching: true,
    code_switching_config: {
      languages: ["af", "ar", "en"],
    },
    translation: true,
    translation_config: {
      target_languages: ["en", "ar"],
      model: "base",
    },
    audio_url:
      "https://storage.googleapis.com/elevenlab/ElevenLabs_2024-11-21T12_28_53_Adam%20Stone%20-%20late%20night%20radio_pvc_s80_sb98_m1.mp3",
  };

  const transcriptionOptions = {
    method: "POST",
    headers: {
      "x-gladia-key": process.env.GLADIA_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  };

  try {
    // Make initial transcription request
    const transcriptionResponse = await fetch(
      "https://api.gladia.io/v2/transcription",
      transcriptionOptions
    );
    const transcriptionResult = await transcriptionResponse.json();

    console.log("Initial transcription response:", transcriptionResult);

    // If we get a transcription ID, check its status
    if (transcriptionResult.id) {
      const statusOptions = {
        method: "GET",
        headers: { "x-gladia-key": process.env.GLADIA_API_KEY },
      };

      // Check status every 5 seconds until complete
      const checkStatus = async () => {
        const statusResponse = await fetch(
          `https://api.gladia.io/v2/transcription/${transcriptionResult.id}`,
          statusOptions
        );
        const statusResult = await statusResponse.json();

        console.log("Status check response:", statusResult);

        if (statusResult.status === "completed") {
          console.log("Transcription completed:", statusResult);
          console.log("\n----- Just the Transcription -----\n");
          console.log(statusResult.result.transcription);
        } else if (
          statusResult.status === "processing" ||
          statusResult.status === "queued"
        ) {
          console.log("Still processing, checking again in 5 seconds...");
          setTimeout(checkStatus, 5000);
        }
      };

      // Start checking status
      await checkStatus();
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

// Run the combined function
transcribeAndCheck();
