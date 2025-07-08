import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import * as turf from '@turf/turf';
import type { Feature, LineString } from 'geojson';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required and must be a string' }, { status: 400 });
    }

    // 1. Use OpenAI to extract stateA, stateB, distance, units
    const prompt = `Extract the two US states and buffer distance from this query. Return as JSON: { stateA, stateB, distance, units }

IMPORTANT: 
- Only extract US state names (e.g., "Virginia", "West Virginia", "California")
- Use proper capitalization (e.g., "Virginia" not "virginia")
- Return valid JSON only

Query: "${query}"`;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that extracts US state names and buffer parameters from user queries. Always return valid JSON with proper US state names.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0,
      max_tokens: 100,
    });
    const response = completion.choices[0]?.message?.content;
    if (!response) {
      return NextResponse.json({ error: 'No response from OpenAI' }, { status: 500 });
    }
    let params;
    try {
      params = JSON.parse(response);
    } catch (e) {
      return NextResponse.json({ error: 'Failed to parse AI response', details: response }, { status: 500 });
    }
    const { stateA, stateB, distance, units } = params;
    if (!stateA || !stateB || !distance) {
      return NextResponse.json({ error: 'AI did not extract required parameters', details: params }, { status: 400 });
    }

    // Debug: Log what the AI extracted
    console.log('AI extracted states:', { stateA, stateB, distance, units });

    // 2. Load states GeoJSON
    const statesRes = await fetch(`${req.nextUrl.origin}/api/geojson/states`);
    const statesData = await statesRes.json();
    
    // Debug: Log available state names (first 5)
    const availableStates = statesData.features.slice(0, 5).map((f: any) => ({
      name: f.properties.name,
      NAME: f.properties.NAME
    }));
    console.log('Available state properties (first 5):', availableStates);
    
    const a = statesData.features.find((f: any) => 
      f.properties.name?.toLowerCase() === stateA.toLowerCase() || 
      f.properties.NAME?.toLowerCase() === stateA.toLowerCase()
    );
    const b = statesData.features.find((f: any) => 
      f.properties.name?.toLowerCase() === stateB.toLowerCase() || 
      f.properties.NAME?.toLowerCase() === stateB.toLowerCase()
    );
    
    // Debug: Log what was found
    console.log('Found state A:', a ? 'Yes' : 'No', 'for:', stateA);
    console.log('Found state B:', b ? 'Yes' : 'No', 'for:', stateB);
    
    if (!a || !b) {
      return NextResponse.json({ error: 'Could not find one or both states', details: { stateA, stateB } }, { status: 400 });
    }

    // 3. Find shared border
    const aLine = turf.polygonToLine(a);
    const bLine = turf.polygonToLine(b);
    const borderPoints = turf.lineIntersect(aLine, bLine);
    if (!borderPoints.features.length) {
      return NextResponse.json({ error: 'No shared border found between the states' }, { status: 400 });
    }
    const borderLine: Feature<LineString> = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: borderPoints.features.map((pt: any) => pt.geometry.coordinates)
      },
      properties: {}
    };

    // 4. Buffer the border
    const buffer = turf.buffer(borderLine, distance, { units: units || 'miles' });
    if (!buffer || !buffer.geometry || buffer.geometry.type !== 'Polygon') {
      return NextResponse.json({ error: 'Failed to create buffer polygon' }, { status: 500 });
    }

    // 5. Return GeoJSON
    return NextResponse.json({
      success: true,
      polygon: buffer
    });
  } catch (error) {
    console.error('NLQ Polygon API error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
} 