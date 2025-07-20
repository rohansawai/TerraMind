import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { userPrompt, previousCode, chatHistory, metadata, previousContext } = await req.json();

    // System prompt for the assistant
    const systemPrompt = `You are an expert assistant for Google Earth Engine Python scripting.
- Always return a JSON object with three fields: code, explanation, and context.
- code: The Python code for the user's request (no authentication code).
- The code must be a stepwise, properly commented, minimal, efficient, headless Python script for Google Earth Engine.
- If the output is an image, print the tile URL using getMapId(vis) and print the bounding box (bbox) of the region. Never use getInfo() for images. Do NOT use getInfo() for images unless the user specifically asks for metadata.
- If the region is a point, create a small buffer or rectangle around it for analysis and visualization.
- If the user specifies a point (city, coordinates, or place), always create a rectangular bounding box (e.g., 0.1 degree buffer) or a buffer (e.g., 5km) around the point for analysis and visualization. Never use a point geometry for region of interest.
- The bbox you print must always be a rectangle with four distinct corners, not a degenerate box.
- Always output a bounding box that covers a visible area (not a degenerate box). The bbox should be suitable for map recentering and visualization.
- Always print the bbox of the region and center the map over the region of interest (output bbox as a separate print statement).
- Do NOT use folium, display(), or any notebook-specific or visualization code. Only use print statements for output (e.g., print GeoJSON, print tile URL, print NDVI stats, print bbox, etc.).
- Do NOT include authentication code (assume ee is already initialized).
- explanation: A short, clear summary of what the code does.
- context: A compressed, one-sentence summary of the session so far, to help with future queries.
- If previous context is provided, use it to inform your response and update it as needed.
- Only output a raw JSON object, not a string or code block.
- Do not wrap the JSON in quotes or triple backticks.
- Never output the JSON as a string. Output a raw JSON object only.`;

    // Build the message list for OpenAI
    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ];
    if (Array.isArray(chatHistory)) {
      messages.push(...chatHistory);
    }
    if (previousCode) {
      messages.push({ role: 'assistant', content: `Current code:\n${previousCode}` });
    }
    if (metadata) {
      messages.push({ role: 'system', content: `Project/session metadata: ${JSON.stringify(metadata)}` });
    }
    if (previousContext) {
      messages.push({ role: 'system', content: `Previous context: ${previousContext}` });
    }
    messages.push({ role: 'user', content: userPrompt });

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.2,
      max_tokens: 900,
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: 'No response from OpenAI' }, { status: 500 });
    }
    let parsed;
    try {
      parsed = JSON.parse(content);
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
    } catch (e) {
      // Try to strip code block markers and parse again
      const cleaned = content.replace(/```json|```/g, '').trim();
      try {
        parsed = JSON.parse(cleaned);
        if (typeof parsed === 'string') {
          parsed = JSON.parse(parsed);
        }
      } catch {
        // Final fallback: try direct parse if it looks like JSON
        if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
          try {
            parsed = JSON.parse(content.trim());
          } catch {
            return NextResponse.json({ error: 'Failed to parse OpenAI response as JSON', details: content }, { status: 500 });
          }
        } else {
          return NextResponse.json({ error: 'Failed to parse OpenAI response as JSON', details: content }, { status: 500 });
        }
      }
    }
    const { code, explanation, context } = parsed;
    return NextResponse.json({ code, explanation, context });
  } catch (error) {
    console.error('Generate Script API error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
} 