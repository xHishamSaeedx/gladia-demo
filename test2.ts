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
      const translation = pollResponse.result.translation;
      console.log(translation);
      break;
    } else {
      console.log("Transcription status : ", pollResponse.status);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

async function startTranscription() {
  const gladiaKey = "b2f341a3-9b2b-468e-8bc2-c9f456682450";
  const requestData = {
    audio_url:
      "https://bunjuqkhbmzgpytdqmrt.supabase.co/storage/v1/object/sign/conversations/Recording%20(2).wav?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJjb252ZXJzYXRpb25zL1JlY29yZGluZyAoMikud2F2IiwiaWF0IjoxNzMyMTkyMzM3LCJleHAiOjE3MzI3OTcxMzd9.Fjlb7TBDtOuU_N4d1nkmvu__Q1zi9Kao14cDLwkzyjA&t=2024-11-21T12%3A32%3A15.231Z",
    enable_code_switching: true,
    code_switching_config: {
      languages: ["en", "ar"],
    },
    translation: true,
    translation_config: {
      target_languages: ["en", "ar"],
      model: "base", // "enhanced" is slower but of better quality
    },
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
