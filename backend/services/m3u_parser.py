import re
import requests
from typing import List, Optional
from models.playlist import Channel, ChannelCreate
import logging

logger = logging.getLogger(__name__)

class M3UParser:
    def __init__(self):
        self.channel_regex = re.compile(r'#EXTINF:(-?\d+)(?:\s+.*?)?,(.+)')
        self.attribute_regex = re.compile(r'(\w+)="([^"]*)"')
        
    def parse_from_url(self, url: str) -> List[Channel]:
        """Parse M3U/M3U8 playlist from URL"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            
            content = response.text
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
        
        if not lines or not lines[0].startswith('#EXTM3U'):
            raise Exception("Archivo M3U inválido: debe comenzar con #EXTM3U")
        
        current_channel = None
        
        for line in lines:
            line = line.strip()
            
            if line.startswith('#EXTINF:'):
                # Parse channel info
                current_channel = self._parse_extinf_line(line)
                
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
        line = line[8:]
        
        # Split duration and info
        parts = line.split(',', 1)
        if len(parts) < 2:
            raise Exception("Formato de línea EXTINF inválido")
        
        duration_and_attrs = parts[0]
        channel_name = parts[1].strip()
        
        # Extract attributes
        attrs = {}
        for match in self.attribute_regex.finditer(duration_and_attrs):
            key, value = match.groups()
            attrs[key.lower()] = value
        
        # Create channel
        channel = Channel(
            name=channel_name,
            url="",  # Will be set later
            logo=attrs.get('tvg-logo', ''),
            category=attrs.get('group-title', 'General'),
            group_title=attrs.get('group-title', ''),
            tvg_id=attrs.get('tvg-id', ''),
            tvg_name=attrs.get('tvg-name', channel_name),
            is_live=True
        )
        
        return channel
    
    def _is_valid_stream_url(self, url: str) -> bool:
        """Validate if URL is a valid streaming URL"""
        if not url or not url.startswith(('http://', 'https://')):
            return False
        
        # Common streaming formats
        valid_extensions = ['.m3u8', '.ts', '.mp4', '.mkv', '.avi', '.flv']
        valid_protocols = ['http://', 'https://']
        
        # Check if URL starts with valid protocol
        if not any(url.startswith(proto) for proto in valid_protocols):
            return False
        
        # Check if URL contains valid streaming indicators
        streaming_indicators = [
            '.m3u8', '.ts', '/live/', '/stream/', 
            'rtmp://', 'rtsp://', ':8080/', ':1935/'
        ]
        
        return any(indicator in url.lower() for indicator in streaming_indicators)
    
    def get_categories(self, channels: List[Channel]) -> List[str]:
        """Extract unique categories from channels"""
        categories = set()
        for channel in channels:
            if channel.category:
                categories.add(channel.category)
        
        return sorted(list(categories))
    
    def filter_channels_by_category(self, channels: List[Channel], category: str) -> List[Channel]:
        """Filter channels by category"""
        if category == "Todos" or not category:
            return channels
        
        return [ch for ch in channels if ch.category == category]
    
    def search_channels(self, channels: List[Channel], query: str) -> List[Channel]:
        """Search channels by name"""
        if not query:
            return channels
        
        query = query.lower()
        return [ch for ch in channels if query in ch.name.lower()]