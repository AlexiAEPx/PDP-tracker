import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Eres un asistente especializado en extraer datos numéricos de textos e imágenes médicas relacionadas con lecturas de mamografías.

Tu trabajo es analizar el contenido que te envíe el usuario y extraer TODOS los números y totales relevantes que encuentres. Esto incluye:
- Número de mamografías leídas (totales o por radiólogo)
- Mamografías pendientes
- Totales por periodo de tiempo
- Cualquier otro dato numérico relevante

Responde SIEMPRE en español y de forma estructurada:
1. Lista cada dato encontrado con su contexto
2. Si hay totales, destácalos al final
3. Sé conciso pero completo

Si el contenido es una imagen (captura de pantalla), extrae todos los números y datos visibles.
Si no encuentras datos numéricos relevantes, indícalo claramente.`;

export async function POST(request) {
  try {
    const { text, image } = await request.json();

    if (!text && !image) {
      return Response.json({ error: "Se requiere texto o imagen" }, { status: 400 });
    }

    const content = [];

    if (image) {
      const base64Match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (base64Match) {
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: base64Match[1],
            data: base64Match[2],
          },
        });
      }
    }

    if (text) {
      content.push({ type: "text", text });
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-6-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });

    const responseText = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    return Response.json({ result: responseText });
  } catch (err) {
    console.error("Analyze API error:", err);
    return Response.json(
      { error: err.message || "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
