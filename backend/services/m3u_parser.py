import re
import requests
from typing import List, Optional
from models.playlist import Channel, ChannelCreate
import logging

logger = logging.getLogger(__name__)

class M3UParser:
    def __init__(self):
        self.channel_regex = re.compile(r'#EXTINF:(-?\d+)(?:\s+.*?)?,(.+)')
        self.attribute_regex = re.compile(r'(\w+[-\w]*)="([^"]*)"')
        
    def parse_from_url(self, url: str) -> List[Channel]:
        """Parse M3U/M3U8 playlist from URL"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            }
            
            response = requests.get(url, headers=headers, timeout=30, allow_redirects=True)
            response.raise_for_status()
            
            # Try different encodings
            content = None
            for encoding in ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']:
                try:
                    content = response.content.decode(encoding)
                    break
                except UnicodeDecodeError:
                    continue
            
            if content is None:
                content = response.content.decode('utf-8', errors='ignore')
            
            return self.parse_content(content)
            
        except requests.RequestException as e:
            logger.error(f"Error downloading M3U from URL {url}: {e}")
            raise Exception(f"Error al descargar la lista: {str(e)}")
        except Exception as e:
            logger.error(f"Error parsing M3U from URL {url}: {e}")
            raise Exception(f"Error al procesar la lista: {str(e)}")
    
    def parse_from_file(self, file_content: str) -> List[Channel]:
        """Parse M3U/M3U8 playlist from file content"""
        try:
            return self.parse_content(file_content)
        except Exception as e:
            logger.error(f"Error parsing M3U file: {e}")
            raise Exception(f"Error al procesar el archivo: {str(e)}")
    
    def parse_content(self, content: str) -> List[Channel]:
        """Parse M3U/M3U8 content and return list of channels"""
        channels = []
        lines = content.strip().split('\n')
        
        # Remove BOM if present
        if lines and lines[0].startswith('\ufeff'):
            lines[0] = lines[0][1:]
        
        if not lines or not lines[0].strip().startswith('#EXTM3U'):
            raise Exception("Archivo M3U inválido: debe comenzar con #EXTM3U")
        
        current_channel = None
        
        for i, line in enumerate(lines):
            line = line.strip()
            
            if line.startswith('#EXTINF:'):
                # Parse channel info
                try:
                    current_channel = self._parse_extinf_line(line)
                except Exception as e:
                    logger.warning(f"Error parsing line {i+1}: {line} - {e}")
                    current_channel = None
                    
            elif line and not line.startswith('#') and current_channel:
                # This is the stream URL
                current_channel.url = line
                
                # Validate URL
                if self._is_valid_stream_url(line):
                    channels.append(current_channel)
                else:
                    logger.warning(f"URL de stream inválida: {line}")
                
                current_channel = None
        
        if not channels:
            raise Exception("No se encontraron canales válidos en la lista")
            
        logger.info(f"Parsed {len(channels)} channels from M3U content")
        return channels
    
    def _parse_extinf_line(self, line: str) -> Channel:
        """Parse #EXTINF line and extract channel information"""
        # Remove #EXTINF: prefix
        line = line[8:].strip()
        
        # Split duration and info
        parts = line.split(',', 1)
        if len(parts) < 2:
            raise Exception("Formato de línea EXTINF inválido")
        
        duration_and_attrs = parts[0]
        channel_name = parts[1].strip()
        
        if not channel_name:
            channel_name = "Canal sin nombre"
        
        # Extract attributes
        attrs = {}
        for match in self.attribute_regex.finditer(duration_and_attrs):
            key, value = match.groups()
            attrs[key.lower()] = value
        
        # Create channel with improved attribute handling
        channel = Channel(
            name=channel_name,
            url="",  # Will be set later
            logo=attrs.get('tvg-logo', '') or attrs.get('logo', ''),
            category=attrs.get('group-title', '') or attrs.get('category', '') or 'General',
            group_title=attrs.get('group-title', ''),
            tvg_id=attrs.get('tvg-id', ''),
            tvg_name=attrs.get('tvg-name', '') or channel_name,
            is_live=True
        )
        
        return channel
    
    def _is_valid_stream_url(self, url: str) -> bool:
        """Validate if URL is a valid streaming URL"""
        if not url or len(url.strip()) < 10:
            return False
        
        url = url.strip().lower()
        
        # Check for valid protocols
        valid_protocols = ['http://', 'https://', 'rtmp://', 'rtmps://', 'rtsp://', 'rtsps://']
        if not any(url.startswith(proto) for proto in valid_protocols):
            return False
        
        # Check for suspicious or invalid patterns
        invalid_patterns = [
            'javascript:', 'data:', 'file:', 'ftp:',
            'localhost', '127.0.0.1', '0.0.0.0',
        ]
        
        if any(pattern in url for pattern in invalid_patterns):
            return False
        
        # Check if URL contains valid streaming indicators
        streaming_indicators = [
            '.m3u8', '.ts', '.mp4', '.mkv', '.avi', '.flv', '.mov', '.wmv', '.webm',
            '/live/', '/stream/', '/hls/', '/dash/', '/playlist',
            ':8080/', ':1935/', ':554/', ':8000/', ':7001/',
            'rtmp', 'rtsp', 'hls', 'dash'
        ]
        
        return any(indicator in url for indicator in streaming_indicators)
    
    def get_categories(self, channels: List[Channel]) -> List[str]:
        """Extract unique categories from channels"""
        categories = set()
        for channel in channels:
            if channel.category and channel.category.strip():
                categories.add(channel.category.strip())
        
        # Sort categories and ensure "General" comes after "Todos"
        sorted_categories = sorted(list(categories))
        if 'General' in sorted_categories:
            sorted_categories.remove('General')
            sorted_categories.append('General')
        
        return sorted_categories
    
    def filter_channels_by_category(self, channels: List[Channel], category: str) -> List[Channel]:
        """Filter channels by category"""
        if category == "Todos" or not category:
            return channels
        
        return [ch for ch in channels if ch.category and ch.category.strip() == category]
    
    def search_channels(self, channels: List[Channel], query: str) -> List[Channel]:
        """Search channels by name"""
        if not query:
            return channels
        
        query = query.lower().strip()
        return [ch for ch in channels if query in ch.name.lower()]
    
    def validate_m3u_content(self, content: str) -> bool:
        """Validate if content is a valid M3U file"""
        try:
            lines = content.strip().split('\n')
            if not lines:
                return False
            
            # Remove BOM if present
            first_line = lines[0]
            if first_line.startswith('\ufeff'):
                first_line = first_line[1:]
            
            return first_line.strip().startswith('#EXTM3U')
        except:
            return False
    
    def get_playlist_info(self, content: str) -> dict:
        """Extract basic playlist information"""
        lines = content.strip().split('\n')
        info = {
            'total_channels': 0,
            'categories': set(),
            'has_logos': 0,
            'valid_urls': 0
        }
        
        current_channel = None
        
        for line in lines:
            line = line.strip()
            
            if line.startswith('#EXTINF:'):
                try:
                    current_channel = self._parse_extinf_line(line)
                    if current_channel.category:
                        info['categories'].add(current_channel.category)
                    if current_channel.logo:
                        info['has_logos'] += 1
                except:
                    current_channel = None
                    
            elif line and not line.startswith('#') and current_channel:
                if self._is_valid_stream_url(line):
                    info['valid_urls'] += 1
                    info['total_channels'] += 1
                current_channel = None
        
        info['categories'] = len(info['categories'])
        return info