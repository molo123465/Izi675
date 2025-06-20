import requests
import unittest
import os
from io import BytesIO
import time

class EnhancedM3UParserTest(unittest.TestCase):
    def setUp(self):
        # Get backend URL from frontend .env file
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    self.base_url = line.strip().split('=')[1].strip('"\'')
                    break
        
        self.api_url = f"{self.base_url}/api"
        print(f"Using API URL: {self.api_url}")
        
        # Sample M3U content with real streaming URLs
        self.real_streams_m3u_content = """#EXTM3U
#EXTINF:-1 tvg-id="NASA.us" tvg-name="NASA Live" tvg-logo="https://www.nasa.gov/sites/default/files/thumbnails/image/nasa-logo-web-rgb.png" group-title="Science",NASA Live
https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8
#EXTINF:-1 tvg-id="RTDoc.ru" tvg-name="RT Documentary" tvg-logo="https://static.wikia.nocookie.net/logopedia/images/b/b7/RT_Doc.svg" group-title="Documentary",RT Documentary
https://rt-rtd.rttv.com/live/rtdoc/playlist.m3u8
#EXTINF:-1 tvg-id="Sample.mp4" tvg-name="Big Buck Bunny" tvg-logo="https://peach.blender.org/wp-content/uploads/title_anouncement.jpg" group-title="Movies",Big Buck Bunny
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
"""

        # Sample M3U content with different encodings and attributes
        self.special_chars_m3u_content = """#EXTM3U
#EXTINF:-1 tvg-id="Canal1.es" tvg-name="Canal Español" tvg-logo="https://example.com/logo.png" group-title="España",Canal Español con ñ y á é í ó ú
https://example.com/stream1.m3u8
#EXTINF:-1 tvg-id="Canal2.fr" tvg-name="Canal Français" tvg-logo="https://example.com/logo2.png" group-title="France",Canal Français avec des caractères spéciaux é è ê ë à
https://example.com/stream2.m3u8
"""

        # Sample M3U content with various streaming protocols
        self.protocols_m3u_content = """#EXTM3U
#EXTINF:-1 tvg-id="HLS.stream" tvg-name="HLS Stream" tvg-logo="https://example.com/hls.png" group-title="Protocols",HLS Stream
https://example.com/stream/playlist.m3u8
#EXTINF:-1 tvg-id="MP4.video" tvg-name="MP4 Video" tvg-logo="https://example.com/mp4.png" group-title="Protocols",MP4 Video
https://example.com/video.mp4
#EXTINF:-1 tvg-id="RTMP.stream" tvg-name="RTMP Stream" tvg-logo="https://example.com/rtmp.png" group-title="Protocols",RTMP Stream
rtmp://example.com/live/stream
"""

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

    def test_01_real_streaming_urls(self):
        """Test M3U parser with real streaming URLs"""
        print("\n=== Testing M3U Parser with Real Streaming URLs ===")
        
        # Create a file-like object with real streaming URLs
        m3u_file = BytesIO(self.real_streams_m3u_content.encode('utf-8'))
        
        # Prepare the multipart/form-data request
        files = {
            'file': ('real_streams.m3u', m3u_file, 'application/octet-stream')
        }
        data = {
            'name': 'Real Streaming URLs Playlist'
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
        self.assertEqual(data["name"], "Real Streaming URLs Playlist")
        self.assertEqual(data["channel_count"], 3)
        
        # Save playlist ID for later tests
        self.playlist_ids.append(data["id"])
        print(f"✅ Real streaming URLs parsed successfully - Created playlist with ID: {data['id']}")
        
        # Get channels to verify parsing
        response = requests.get(f"{self.api_url}/playlists/{data['id']}/channels")
        self.assertEqual(response.status_code, 200)
        channels = response.json()
        
        # Verify channel names and URLs
        channel_names = [ch["name"] for ch in channels]
        self.assertIn("NASA Live", channel_names)
        self.assertIn("RT Documentary", channel_names)
        self.assertIn("Big Buck Bunny", channel_names)
        
        # Verify streaming URLs
        for channel in channels:
            if channel["name"] == "NASA Live":
                self.assertIn("ntv1.akamaized.net/hls/live", channel["url"])
                self.assertEqual(channel["category"], "Science")
                print("✅ NASA Live HLS stream correctly parsed")
            elif channel["name"] == "RT Documentary":
                self.assertIn("rt-rtd.rttv.com/live/rtdoc", channel["url"])
                self.assertEqual(channel["category"], "Documentary")
                print("✅ RT Documentary HLS stream correctly parsed")
            elif channel["name"] == "Big Buck Bunny":
                self.assertIn("commondatastorage.googleapis.com", channel["url"])
                self.assertEqual(channel["category"], "Movies")
                print("✅ Big Buck Bunny MP4 stream correctly parsed")

    def test_02_encoding_support(self):
        """Test M3U parser with special characters and different encodings"""
        print("\n=== Testing M3U Parser Encoding Support ===")
        
        # Create a file-like object with special characters
        m3u_file = BytesIO(self.special_chars_m3u_content.encode('utf-8'))
        
        # Prepare the multipart/form-data request
        files = {
            'file': ('special_chars.m3u', m3u_file, 'application/octet-stream')
        }
        data = {
            'name': 'Special Characters Playlist'
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
        self.assertEqual(data["name"], "Special Characters Playlist")
        self.assertEqual(data["channel_count"], 2)
        
        # Save playlist ID for later tests
        self.playlist_ids.append(data["id"])
        print(f"✅ Special characters support working - Created playlist with ID: {data['id']}")
        
        # Get channels to verify parsing
        response = requests.get(f"{self.api_url}/playlists/{data['id']}/channels")
        self.assertEqual(response.status_code, 200)
        channels = response.json()
        
        # Verify special characters in channel names
        channel_names = [ch["name"] for ch in channels]
        self.assertTrue(any("ñ" in name for name in channel_names))
        self.assertTrue(any("é" in name for name in channel_names))
        
        # Verify categories with special characters
        categories = [ch["category"] for ch in channels]
        self.assertIn("España", categories)
        self.assertIn("France", categories)
        
        print("✅ Special characters correctly handled in channel names and categories")

    def test_03_streaming_protocols(self):
        """Test validation of various streaming protocols"""
        print("\n=== Testing Streaming Protocol Validation ===")
        
        # Create a file-like object with various protocols
        m3u_file = BytesIO(self.protocols_m3u_content.encode('utf-8'))
        
        # Prepare the multipart/form-data request
        files = {
            'file': ('protocols.m3u', m3u_file, 'application/octet-stream')
        }
        data = {
            'name': 'Streaming Protocols Playlist'
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
        self.assertEqual(data["name"], "Streaming Protocols Playlist")
        self.assertEqual(data["channel_count"], 3)
        
        # Save playlist ID for later tests
        self.playlist_ids.append(data["id"])
        print(f"✅ Streaming protocol validation working - Created playlist with ID: {data['id']}")
        
        # Get channels to verify parsing
        response = requests.get(f"{self.api_url}/playlists/{data['id']}/channels")
        self.assertEqual(response.status_code, 200)
        channels = response.json()
        
        # Verify different protocols
        protocols_found = set()
        for channel in channels:
            if "m3u8" in channel["url"]:
                protocols_found.add("HLS")
            elif "mp4" in channel["url"]:
                protocols_found.add("MP4")
            elif "rtmp:" in channel["url"]:
                protocols_found.add("RTMP")
        
        self.assertIn("HLS", protocols_found)
        self.assertIn("MP4", protocols_found)
        self.assertIn("RTMP", protocols_found)
        
        print(f"✅ Successfully validated different streaming protocols: {', '.join(protocols_found)}")

    def test_04_category_management(self):
        """Test category extraction and filtering"""
        print("\n=== Testing Category Management ===")
        
        # Get all categories
        response = requests.get(f"{self.api_url}/playlists/categories")
        self.assertEqual(response.status_code, 200)
        categories = response.json()
        
        # Verify "Todos" is the first category
        self.assertTrue(len(categories) > 0)
        self.assertEqual(categories[0], "Todos")
        
        # Verify our test categories are present
        expected_categories = ["Science", "Documentary", "Movies", "Protocols", "España", "France"]
        for category in expected_categories:
            if category in categories:
                print(f"✅ Found category: {category}")
            else:
                print(f"❌ Missing category: {category}")
        
        # Test filtering by category
        if len(self.playlist_ids) > 0:
            playlist_id = self.playlist_ids[0]  # Use the first playlist
            
            # Get all channels from the playlist
            response = requests.get(f"{self.api_url}/playlists/{playlist_id}/channels")
            self.assertEqual(response.status_code, 200)
            all_channels = response.json()
            
            # Get a category from the first channel
            if all_channels:
                category = all_channels[0]["category"]
                
                # Filter by that category
                response = requests.get(f"{self.api_url}/playlists/{playlist_id}/channels?category={category}")
                self.assertEqual(response.status_code, 200)
                filtered_channels = response.json()
                
                # Verify all returned channels have the correct category
                self.assertTrue(all(ch["category"] == category for ch in filtered_channels))
                print(f"✅ Category filtering working - Found {len(filtered_channels)} channels in category '{category}'")
                
                # Test filtering across all playlists
                response = requests.get(f"{self.api_url}/playlists/channels?category={category}")
                self.assertEqual(response.status_code, 200)
                all_filtered_channels = response.json()
                
                # Verify all returned channels have the correct category
                self.assertTrue(all(ch["category"] == category for ch in all_filtered_channels))
                print(f"✅ Global category filtering working - Found {len(all_filtered_channels)} channels in category '{category}' across all playlists")

    def test_05_error_handling(self):
        """Test error handling for various file formats and invalid URLs"""
        print("\n=== Testing Error Handling ===")
        
        # Test invalid file format
        invalid_content = "This is not an M3U file"
        invalid_file = BytesIO(invalid_content.encode('utf-8'))
        
        files = {
            'file': ('invalid.txt', invalid_file, 'text/plain')
        }
        data = {
            'name': 'Invalid File'
        }
        
        response = requests.post(
            f"{self.api_url}/playlists/upload",
            files=files,
            data=data
        )
        
        # Should return an error (either 400 or 500)
        self.assertIn(response.status_code, [400, 500])
        print(f"✅ Error handling for invalid file format working - Status code: {response.status_code}")
        
        # Test invalid URL
        payload = {
            "name": "Invalid URL Playlist",
            "url": "https://example.com/nonexistent.m3u"
        }
        
        response = requests.post(
            f"{self.api_url}/playlists/url",
            json=payload
        )
        
        # Should return an error (either 400 or 500)
        self.assertIn(response.status_code, [400, 500])
        print(f"✅ Error handling for invalid URL working - Status code: {response.status_code}")
        
        # Test invalid playlist ID
        response = requests.get(f"{self.api_url}/playlists/invalid-id/channels")
        self.assertEqual(response.status_code, 404)
        print("✅ Error handling for invalid playlist ID working")

    def test_06_cleanup(self):
        """Clean up test playlists"""
        print("\n=== Cleaning Up Test Data ===")
        
        for playlist_id in self.playlist_ids:
            response = requests.delete(f"{self.api_url}/playlists/{playlist_id}")
            if response.status_code == 200:
                print(f"✅ Successfully deleted playlist: {playlist_id}")
            else:
                print(f"❌ Failed to delete playlist: {playlist_id}")

if __name__ == '__main__':
    unittest.main(argv=['first-arg-is-ignored'], exit=False)