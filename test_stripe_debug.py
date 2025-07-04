#!/usr/bin/env python3

import requests
import json
import os

# Test the debug endpoint
def test_stripe_debug():
    # You'll need to get a valid JWT token first
    # This is just the structure - you'll need to login first
    
    backend_url = "https://supreme-space-orbit-pjjpjpp7rp5wf47v-3001.app.github.dev"
    
    # You'll need to replace this with a real token from your browser session
    token = "YOUR_JWT_TOKEN_HERE"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(f"{backend_url}/api/debug-stripe", headers=headers)
        print("🔍 DEBUG RESPONSE:")
        print(json.dumps(response.json(), indent=2))
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🚀 Testing Stripe Debug Endpoint...")
    test_stripe_debug() 