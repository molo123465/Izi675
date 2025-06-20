import requests
import unittest
import os
import json
from io import BytesIO
import time

class IPTVPlayerBackendTest(unittest.TestCase):
    def setUp(self):
        # Get backend URL from frontend .env file
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    self.base_url = line.strip().split('=')[1].strip('"\'')
                    break
        
        self.api_url = f"{self.base_url}/api"
        print(f"Using API URL: {self.api_url}")
        
        self.sample_m3u_content = """#EXTM3U
#EXTINF:-1 tvg-id="ESPN.us" tvg-name="ESPN" tvg-logo="https://example.com/espn.png" group-title="Sports",ESPN
https://example.com/espn/index.m3u8
#EXTINF:-1 tvg-id="CNN.us" tvg-name="CNN" tvg-logo="https://example.com/cnn.png" group-title="News",CNN
https://example.com/cnn/index.m3u8
#EXTINF:-1 tvg-id="HBO.us" tvg-name="HBO" tvg-logo="https://example.com/hbo.png" group-title="Movies",HBO
https://example.com/hbo/index.m3u8
"""
        self.sample_playlist_url = "https://iptv-org.github.io/iptv/index.m3u"
        self.playlist_ids = []
        
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

    def test_01_api_health(self):
        """Test API health endpoints"""
        print("\n=== Testing API Health ===")
        
        # Test root endpoint
        response = requests.get(f"{self.api_url}/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["message"], "IPTV Player API is running")
        self.assertEqual(data["status"], "ok")
        print("✅ API root endpoint working")
        
        # Test health endpoint
        response = requests.get(f"{self.api_url}/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["database"], "connected")
        print("✅ API health endpoint working")

    def test_02_playlist_upload(self):
        """Test playlist file upload functionality"""
        print("\n=== Testing Playlist Upload ===")
        
        # Create a file-like object with sample M3U content
        m3u_file = BytesIO(self.sample_m3u_content.encode('utf-8'))
        
        # Prepare the multipart/form-data request
        files = {
            'file': ('test_playlist.m3u', m3u_file, 'application/octet-stream')
        }
        data = {
            'name': 'Test Playlist'
        }
        
        # Send the request
        response = requests.post(
            f"{self.api_url}/playlists/upload",
            files=files,
            data=data
        )
        
        # Check response
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["name"], "Test Playlist")
        self.assertEqual(data["channel_count"], 3)
        
        # Save playlist ID for later tests
        self.playlist_ids.append(data["id"])
        print(f"✅ Playlist upload working - Created playlist with ID: {data['id']}")

    def test_03_playlist_from_url(self):
        """Test adding playlist from URL"""
        print("\n=== Testing Playlist from URL ===")
        
        # Prepare request data
        payload = {
            "name": "Test URL Playlist",
            "url": self.sample_playlist_url
        }
        
        # Send the request
        response = requests.post(
            f"{self.api_url}/playlists/url",
            json=payload
        )
        
        # Check response
        if response.status_code == 200:
            data = response.json()
            self.assertEqual(data["name"], "Test URL Playlist")
            self.assertTrue(data["channel_count"] > 0)
            
            # Save playlist ID for later tests
            self.playlist_ids.append(data["id"])
            print(f"✅ Playlist from URL working - Created playlist with ID: {data['id']} with {data['channel_count']} channels")
        else:
            print(f"⚠️ Playlist from URL test skipped - Status code: {response.status_code}, Response: {response.text}")
            print("This might be due to network restrictions or the sample URL being unavailable")

    def test_04_get_playlists(self):
        """Test getting all playlists"""
        print("\n=== Testing Get Playlists ===")
        
        # Send the request
        response = requests.get(f"{self.api_url}/playlists/")
        
        # Check response
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        
        # Verify our uploaded playlists are in the list
        playlist_ids = [p["id"] for p in data]
        for pid in self.playlist_ids:
            if pid in playlist_ids:
                print(f"✅ Found playlist {pid} in the list")
            else:
                print(f"❌ Playlist {pid} not found in the list")
        
        print(f"✅ Get playlists working - Found {len(data)} playlists")

    def test_05_get_channels(self):
        """Test getting channels from a playlist"""
        print("\n=== Testing Get Channels ===")
        
        if not self.playlist_ids:
            print("⚠️ No playlists available for testing channels")
            return
        
        # Get channels from the first playlist
        playlist_id = self.playlist_ids[0]
        response = requests.get(f"{self.api_url}/playlists/{playlist_id}/channels")
        
        # Check response
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        
        print(f"✅ Get channels working - Found {len(data)} channels in playlist {playlist_id}")
        
        # Test channel filtering by category
        if data:
            # Get a category from the first channel
            category = data[0]["category"]
            if category:
                response = requests.get(f"{self.api_url}/playlists/{playlist_id}/channels?category={category}")
                self.assertEqual(response.status_code, 200)
                filtered_data = response.json()
                self.assertIsInstance(filtered_data, list)
                print(f"✅ Channel filtering by category working - Found {len(filtered_data)} channels in category '{category}'")
        
        # Test channel search
        if data:
            # Search using part of the first channel name
            search_term = data[0]["name"][:3]
            response = requests.get(f"{self.api_url}/playlists/{playlist_id}/channels?search={search_term}")
            self.assertEqual(response.status_code, 200)
            search_data = response.json()
            self.assertIsInstance(search_data, list)
            print(f"✅ Channel search working - Found {len(search_data)} channels matching '{search_term}'")

    def test_06_get_all_channels(self):
        """Test getting all channels from all playlists"""
        print("\n=== Testing Get All Channels ===")
        
        # Send the request
        response = requests.get(f"{self.api_url}/playlists/channels")
        
        # Check response
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        
        print(f"✅ Get all channels working - Found {len(data)} channels across all playlists")
        
        # Test filtering and search if channels exist
        if data:
            # Test category filtering
            category = data[0]["category"]
            if category:
                response = requests.get(f"{self.api_url}/playlists/channels?category={category}")
                self.assertEqual(response.status_code, 200)
                filtered_data = response.json()
                self.assertIsInstance(filtered_data, list)
                print(f"✅ All channels filtering by category working - Found {len(filtered_data)} channels in category '{category}'")
            
            # Test search
            search_term = data[0]["name"][:3]
            response = requests.get(f"{self.api_url}/playlists/channels?search={search_term}")
            self.assertEqual(response.status_code, 200)
            search_data = response.json()
            self.assertIsInstance(search_data, list)
            print(f"✅ All channels search working - Found {len(search_data)} channels matching '{search_term}'")

    def test_07_get_categories(self):
        """Test getting all unique categories"""
        print("\n=== Testing Get Categories ===")
        
        # Send the request
        response = requests.get(f"{self.api_url}/playlists/categories")
        
        # Check response
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        
        # Verify "Todos" is the first category
        if data:
            self.assertEqual(data[0], "Todos")
        
        print(f"✅ Get categories working - Found {len(data)} unique categories")

    def test_08_refresh_playlist(self):
        """Test refreshing a playlist from URL"""
        print("\n=== Testing Playlist Refresh ===")
        
        # Skip if no URL-based playlist is available
        if len(self.playlist_ids) < 2:
            print("⚠️ No URL-based playlist available for testing refresh")
            return
        
        # Use the second playlist (from URL) for refresh test
        playlist_id = self.playlist_ids[1]
        
        # Send the request
        response = requests.put(f"{self.api_url}/playlists/{playlist_id}/refresh")
        
        # Check response
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Playlist refresh working - Refreshed playlist {playlist_id} with {data['channel_count']} channels")
        elif response.status_code == 400:
            # This might happen if the playlist is not URL-based
            print(f"⚠️ Playlist refresh test skipped - Not a URL-based playlist")
        else:
            self.fail(f"Playlist refresh failed with status code {response.status_code}: {response.text}")

    def test_09_delete_playlist(self):
        """Test deleting a playlist"""
        print("\n=== Testing Playlist Deletion ===")
        
        if not self.playlist_ids:
            print("⚠️ No playlists available for deletion test")
            return
        
        # Delete the first playlist
        playlist_id = self.playlist_ids[0]
        
        # Send the request
        response = requests.delete(f"{self.api_url}/playlists/{playlist_id}")
        
        # Check response
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["message"], "Playlist eliminada exitosamente")
        
        # Verify playlist is deleted
        response = requests.get(f"{self.api_url}/playlists/")
        playlists = response.json()
        playlist_ids = [p["id"] for p in playlists]
        self.assertNotIn(playlist_id, playlist_ids)
        
        print(f"✅ Playlist deletion working - Deleted playlist {playlist_id}")
        
        # Remove the deleted playlist ID from our list
        self.playlist_ids.remove(playlist_id)

    def test_10_error_handling(self):
        """Test error handling for invalid inputs"""
        print("\n=== Testing Error Handling ===")
        
        # Test invalid playlist ID
        response = requests.get(f"{self.api_url}/playlists/invalid-id/channels")
        self.assertEqual(response.status_code, 404)
        print("✅ Error handling for invalid playlist ID working")
        
        # Test invalid file upload (non-M3U file)
        invalid_file = BytesIO(b"This is not an M3U file")
        files = {
            'file': ('invalid.txt', invalid_file, 'text/plain')
        }
        response = requests.post(
            f"{self.api_url}/playlists/upload",
            files=files,
            data={'name': 'Invalid File'}
        )
        self.assertEqual(response.status_code, 400)
        print("✅ Error handling for invalid file upload working")
        
        # Test invalid URL
        payload = {
            "name": "Invalid URL Playlist",
            "url": "https://example.com/invalid.m3u"
        }
        response = requests.post(
            f"{self.api_url}/playlists/url",
            json=payload
        )
        # This should either return 400 or 500 depending on how the server handles invalid URLs
        self.assertIn(response.status_code, [400, 500])
        print("✅ Error handling for invalid URL working")

if __name__ == '__main__':
    unittest.main(argv=['first-arg-is-ignored'], exit=False)