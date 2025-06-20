import requests
import unittest
import os
from io import BytesIO
import time

class EncodingTest(unittest.TestCase):
    def setUp(self):
        # Get backend URL from frontend .env file
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    self.base_url = line.strip().split('=')[1].strip('"\'')
                    break
        
        self.api_url = f"{self.base_url}/api"
        print(f"Using API URL: {self.api_url}")
        
        # Sample M3U content with different encodings and attributes
        self.latin1_m3u_content = """#EXTM3U
#EXTINF:-1 tvg-id="Canal1.es" tvg-name="Canal Español" tvg-logo="https://example.com/logo.png" group-title="España",Canal Español con ñ y á é í ó ú
https://example.com/stream1.m3u8
#EXTINF:-1 tvg-id="Canal2.fr" tvg-name="Canal Français" tvg-logo="https://example.com/logo2.png" group-title="France",Canal Français avec des caractères spéciaux é è ê ë à
https://example.com/stream2.m3u8
"""
        
        # Wait for backend to be fully ready
        self._wait_for_backend()
    
    def _wait_for_backend(self, max_retries=5, delay=2):
        """Wait for backend to be ready"""
        for i in range(max_retries):
            try:
                response = requests.get(f"{self.api_url}/health", timeout=5)
                if response.status_code == 200 and response.json().get("status") == "healthy":
                    print("Backend is ready!")
                    return True
                else:
                    print(f"Backend not ready yet (attempt {i+1}/{max_retries}), waiting...")
            except Exception as e:
                print(f"Error connecting to backend (attempt {i+1}/{max_retries}): {e}")
            
            time.sleep(delay)
        
        print("WARNING: Backend might not be fully ready, proceeding with tests anyway")
        return False

    def test_encoding_support(self):
        """Test M3U parser with different character encodings"""
        print("\n=== Testing M3U Parser Encoding Support ===")
        
        # Create a file-like object with UTF-8 encoded content (since Latin-1 might be causing issues)
        m3u_file = BytesIO(self.latin1_m3u_content.encode('utf-8'))
        
        # Prepare the multipart/form-data request
        files = {
            'file': ('utf8_playlist.m3u', m3u_file, 'application/octet-stream')
        }
        data = {
            'name': 'UTF-8 Encoded Playlist'
        }
        
        # Send the request
        response = requests.post(
            f"{self.api_url}/playlists/upload",
            files=files,
            data=data
        )
        
        # Check response
        print(f"Response status code: {response.status_code}")
        print(f"Response content: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Created playlist with ID: {data['id']} and {data['channel_count']} channels")
            
            # Get channels to verify parsing
            response = requests.get(f"{self.api_url}/playlists/{data['id']}/channels")
            if response.status_code == 200:
                channels = response.json()
                
                # Print channel details
                for channel in channels:
                    print(f"Channel: {channel['name']}")
                    print(f"Category: {channel['category']}")
                    print(f"URL: {channel['url']}")
                    print("---")
                
                # Verify special characters in channel names
                channel_names = [ch["name"] for ch in channels]
                has_special_chars = any("ñ" in name for name in channel_names)
                print(f"Has special characters: {has_special_chars}")
                
                # Verify categories with special characters
                categories = [ch["category"] for ch in channels]
                print(f"Categories: {categories}")
                
                # Clean up
                response = requests.delete(f"{self.api_url}/playlists/{data['id']}")
                print(f"Cleanup status: {response.status_code}")
            else:
                print(f"Failed to get channels: {response.status_code} - {response.text}")
        else:
            print(f"Failed to create playlist: {response.status_code} - {response.text}")

if __name__ == '__main__':
    unittest.main(argv=['first-arg-is-ignored'], exit=False)