from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import tempfile
import os
import ee
import re
import json

# Set your service account and key path here
SERVICE_ACCOUNT = 'terramind-backend@celtic-defender-461219-j5.iam.gserviceaccount.com'
KEY_PATH = '/Users/sawairohan90/TerraMind/celtic-defender-461219-j5-ed983bf91afc.json'

# Authenticate with GEE once at startup
def gee_auth():
    credentials = ee.ServiceAccountCredentials(SERVICE_ACCOUNT, KEY_PATH)
    ee.Initialize(credentials)
gee_auth()

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local dev; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CodeRequest(BaseModel):
    code: str

TILE_URL_REGEX = re.compile(r"https://earthengine\.googleapis\.com/[^\s]+/\{z\}/\{x\}/\{y\}(\?token=[^\s]+)?")

@app.post('/run')
async def run_code(req: CodeRequest):
    # Prepend GEE authentication to user code
    gee_auth_code = '''import ee\nimport json\nservice_account = "terramind-backend@celtic-defender-461219-j5.iam.gserviceaccount.com"\nkey_path = "/Users/sawairohan90/TerraMind/celtic-defender-461219-j5-ed983bf91afc.json"\ncredentials = ee.ServiceAccountCredentials(service_account, key_path)\nee.Initialize(credentials)\n'''
    full_code = gee_auth_code + '\n' + req.code
    # Write the code to a temp file
    with tempfile.NamedTemporaryFile('w', suffix='.py', delete=False) as f:
        f.write(full_code)
        temp_path = f.name
    try:
        # Run the code in a subprocess
        result = subprocess.run(
            ['python3', temp_path],
            capture_output=True,
            text=True,
            timeout=60  # prevent runaway scripts
        )
        tile_url = None
        bbox = None
        geojson = None
        output_type = 'unknown'
        if result.stdout:
            # Try to extract tile_url
            match = TILE_URL_REGEX.search(result.stdout)
            if match:
                tile_url = match.group(0)
            # Try to extract bbox
            for line in result.stdout.splitlines():
                try:
                    obj = json.loads(line)
                    if isinstance(obj, dict) and 'bbox' in obj:
                        bbox = obj['bbox']
                except Exception:
                    continue
            # Try to parse as GeoJSON
            try:
                parsed = json.loads(result.stdout)
                if isinstance(parsed, dict) and (
                    parsed.get('type') == 'FeatureCollection' or parsed.get('type') == 'Feature' or parsed.get('features')
                ):
                    geojson = parsed
            except Exception:
                pass
        # Decide output type
        if tile_url:
            output_type = 'raster'
        elif geojson:
            output_type = 'vector'
        response = {
            'type': output_type,
            'tile_url': tile_url,
            'bbox': bbox,
            'geojson': geojson,
            'stdout': result.stdout,
            'stderr': result.stderr,
            'exit_code': result.returncode
        }
        print('[gee_runner_service.py] Backend response:', json.dumps(response)[:500])  # Print first 500 chars for debug
        return JSONResponse(response)
    except subprocess.TimeoutExpired:
        return JSONResponse({'error': 'Execution timed out.'}, status_code=500)
    except Exception as e:
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        os.unlink(temp_path) 