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
- Never output the JSON as a string. Output a raw JSON object only.
- Never wrap the JSON in code blocks or quotes. Never output the JSON as a string. Output a raw JSON object only.
- If the user specifies a single date for filtering an image collection, always set the end date to one month after the start date (end_date = start_date + 1 month) to avoid empty date range errors in Earth Engine.
- If using Sentinel-1 SAR data, always check that both 'VV' and 'VH' bands exist in each image before using them (e.g., by filtering or conditional logic). If not present, skip or handle safely to avoid errors. Never assume both bands are present in all images.
- You must always respond using the provided function/tool call, never as plain text or a code block. Do not output code blocks or plain text. Only use the function call with the required arguments.
- When using Sentinel-2, always use the current, supported collection (COPERNICUS/S2_HARMONIZED). Do not use deprecated assets.
- When visualizing an image, always select a single band (e.g., .select('NDVI')) before applying a palette or visualization parameters.
- For any flood risk mapping using Sentinel-1, always:
  - Use the COPERNICUS/S1_GRD collection.
  - Use a buffer of 10 km around the specified city or coordinates.
  - Use a date range of at least 7 days.
  - Filter for both 'VV' and 'VH' polarizations and 'IW' mode.
  - Compute the VH/VV ratio as a single-band image for flood mapping.
  - Print the image count after filtering.
  - Visualize the result as a single-band raster with a blue-white-green palette.
  - Print the tile URL and bounding box.

- For NDVI mapping, always:
  - NEVER use deprecated assets.
  - Use a buffer of 10 km around the specified city or coordinates.
  - Use the date range provided by the user.
  - Mask clouds using the QA60 band.
  - Add NDVI as a band (B8 - B4) / (B8 + B4).
  - Print the image count after filtering.
  - Visualize the median NDVI as a single-band raster with a white-green palette.
  - Print the tile URL and bounding box.

- For country boundaries or vector layers:
  - Use a current, public dataset (e.g., FAO/GAUL/2015/level0 or USDOS/LSIB_SIMPLE/2017).
  - Filter for the specified country.
  - Print the bounding box of the country.
  - Visualize the boundaries as a vector layer and print the tile URL if possible.`;

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

    // Define the function schema for tool-calling
    const tools = [
      {
        type: 'function' as const,
        function: {
          name: 'myResponse',
          description: 'Return the code, explanation, and context for a geospatial analysis task.',
          parameters: {
            type: 'object',
            properties: {
              code: { type: 'string', description: 'The Python code to run.' },
              explanation: { type: 'string', description: 'Explanation of the code.' },
              context: { type: 'string', description: 'Context for the user request.' }
            },
            required: ['code', 'explanation', 'context']
          }
        }
      }
    ];

    // Call OpenAI with function-calling
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-1106-preview',
      messages,
      temperature: 0.2,
      max_tokens: 900,
      tools,
      tool_choice: 'auto',
    });

    // Extract the function call arguments
    const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
    let args = toolCall?.function?.arguments;
    if (!args) {
      return NextResponse.json({ error: 'No function_call arguments returned by OpenAI', details: completion }, { status: 500 });
    }
    // Parse arguments if it's a string
    if (typeof args === 'string') {
      args = JSON.parse(args);
    }
    if (!args || typeof args !== 'object') {
      return NextResponse.json({ error: 'Function call arguments are not an object', details: args }, { status: 500 });
    }
    const { code, explanation, context } = args;
    return NextResponse.json({ code, explanation, context });
  } catch (error) {
    console.error('Generate Script API error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
} 