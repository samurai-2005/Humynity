import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

// Server-side secret scrubber to protect client credentials
function scrubSensitiveData(text: string): string {
  return text
    .replace(/(?:sk|pk)_(?:live|test)_[0-9a-zA-Z]{24,}/g, "[REDACTED_STRIPE_KEY]")
    .replace(/(?:postgres|postgresql|mongodb(?:\+srv)?|mysql):\/\/[^\s"']+/g, "[REDACTED_DB_URI]")
    .replace(/Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, "Bearer [REDACTED_JWT]")
    .replace(/gh[pousr]_[A-Za-z0-9_]{36,}/g, "[REDACTED_GITHUB_TOKEN]")
    .replace(/(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g, "[REDACTED_AWS_KEY]")
    .replace(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+/g, "[REDACTED_SUPABASE_TOKEN]");
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured in environment variables." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { manifest } = body;

    if (!manifest || typeof manifest !== "string" || manifest.trim().length < 20) {
      return NextResponse.json(
        { error: "A valid diagnostic manifest is required (minimum 20 characters)." },
        { status: 400 }
      );
    }

    const sanitizedManifest = scrubSensitiveData(manifest);
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
You are the Lead Technical Triage Architect for Humynity, a high-trust debugging platform for AI-assisted developers (vibe coders).
Your job is to analyze the user's technical problem manifest and make two critical decisions:
1. Determine the safest execution mode: "live_workspace" (voice + screen share) OR "async_task" (GitHub PR / file drop).
2. Extract clean, accurate task metadata to prefill the task submission form.

DETERMINISTIC MODE LOGIC:
Assign "live_workspace" IF ANY of these are true:
- The bug involves private credentials, local database seeds, or authentication callback loops (localhost OAuth) that cannot be shared in a public repository.
- The client is coding inside a browser sandbox (Bolt.new, v0, Lovable, Replit) and has NO git repository.
- The bug is machine-dependent (local Docker daemon, native OS build tool failure, Windows C++ build errors, local venv/POSIX structures).
- The client has made 5+ failed circular attempts with an LLM, indicating complex state corruption requiring visual inspection.

Assign "async_task" ONLY IF ALL of these are true:
- The issue is self-contained (TypeScript typing error, isolated route handler, styling mismatch, unit test failure).
- Reproduction does not require private production credentials.
- The client has an accessible GitHub repository OR can provide 1 to 3 isolated source files.

Be concise, realistic with bounties in INR, and prioritize developer security.
`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        recommended_mode: {
          type: Type.STRING,
          enum: ["live_workspace", "async_task"],
          description: "Determined execution model based on technical requirements.",
        },
        mode_rationale: {
          type: Type.STRING,
          description: "1-2 sentences explaining to the client why this mode was chosen.",
        },
        client_action_instruction: {
          type: Type.STRING,
          description: "Direct action item for the client on the next step.",
        },
        form_prefill: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "Concise, professional engineering bug title (max 10 words).",
            },
            category: {
              type: Type.STRING,
              enum: ["debugging", "api_integration", "ui_styling", "auth_database"],
            },
            skills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Detected languages, libraries, and frameworks.",
            },
            description: {
              type: Type.STRING,
              description: "Cleanly structured markdown report containing bug symptom, error logs, and expected outcome.",
            },
            required_files_to_upload: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Specific filenames the client should upload if using file drop.",
            },
            recommended_bounty_inr: {
              type: Type.NUMBER,
              description: "Estimated fair bounty in INR based on task complexity.",
            },
            recommended_duration_hours: {
              type: Type.NUMBER,
              description: "Duration recommendation in hours.",
            },
          },
          required: [
            "title",
            "category",
            "skills",
            "description",
            "recommended_bounty_inr",
            "recommended_duration_hours",
          ],
        },
        missing_requirements: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Any missing technical info that the specialist will still need.",
        },
      },
      required: [
        "recommended_mode",
        "mode_rationale",
        "client_action_instruction",
        "form_prefill",
        "missing_requirements",
      ],
    };

    let responseText: string | null = null;
    let lastError: any = null;

    // Retry loop with backoff for 503 / 429 server spikes
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: `Evaluate this sanitized project manifest:\n"""\n${sanitizedManifest}\n"""`,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema,
          },
        });

        if (response && response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        const errStr = JSON.stringify(err);
        const isTransient =
          errStr.includes("503") ||
          errStr.includes("429") ||
          errStr.includes("UNAVAILABLE");

        console.warn(`[AI Triage Attempt ${attempt}]:`, err.message || err);

        if (attempt < 3 && isTransient) {
          await sleep(attempt * 2000);
        }
      }
    }

    if (!responseText) {
      throw lastError || new Error("Failed to receive response from AI triage.");
    }

    const parsedOutput = JSON.parse(responseText);
    return NextResponse.json(parsedOutput);
  } catch (error: any) {
    console.error("[AI Triage Route Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process task triage." },
      { status: 500 }
    );
  }
}