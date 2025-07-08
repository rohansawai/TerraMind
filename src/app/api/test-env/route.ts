import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  return NextResponse.json({
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey ? apiKey.length : 0,
    apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'none',
    allEnvVars: Object.keys(env).filter(key => key.includes('OPENAI')),
    envModuleLoaded: true,
    apiKeyFromEnvModule: apiKey ? 'loaded' : 'not loaded',
    processEnvOpenAI: env.OPENAI_API_KEY ? 'exists' : 'missing',
    processEnvOpenAILength: env.OPENAI_API_KEY?.length || 0,
    processEnvOpenAIPrefix: env.OPENAI_API_KEY?.substring(0, 10) || 'none',
    cwd: process.cwd(),
    nodeEnv: env.NODE_ENV
  });
} 