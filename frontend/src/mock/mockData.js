// Mock data para el reproductor IPTV
export const mockChannels = [
  {
    id: 1,
    name: "Canal 1 HD",
    url: "https://example.com/channel1.m3u8",
    logo: "https://via.placeholder.com/100x60/FF6B6B/FFFFFF?text=C1",
    category: "Entretenimiento",
    isLive: true
  },
  {
    id: 2,
    name: "Deportes TV",
    url: "https://example.com/sports.m3u8", 
    logo: "https://via.placeholder.com/100x60/4ECDC4/FFFFFF?text=DTV",
    category: "Deportes",
    isLive: true
  },
  {
    id: 3,
    name: "Noticias 24h",
    url: "https://example.com/news.m3u8",
    logo: "https://via.placeholder.com/100x60/45B7D1/FFFFFF?text=N24",
    category: "Noticias", 
    isLive: true
  },
  {
    id: 4,
    name: "Música Plus",
    url: "https://example.com/music.m3u8",
    logo: "https://via.placeholder.com/100x60/F7DC6F/000000?text=M+",
    category: "Música",
    isLive: false
  },
  {
    id: 5,
    name: "Cine Clásico",
    url: "https://example.com/classic.m3u8",
    logo: "https://via.placeholder.com/100x60/BB8FCE/FFFFFF?text=CC",
    category: "Películas",
    isLive: true
  },
  {
    id: 6,
    name: "Infantil TV",
    url: "https://example.com/kids.m3u8",
    logo: "https://via.placeholder.com/100x60/58D68D/FFFFFF?text=ITV",
    category: "Infantil",
    isLive: true
  }
];

export const mockCategories = [
  "Todos",
  "Entretenimiento", 
  "Deportes",
  "Noticias",
  "Música", 
  "Películas",
  "Infantil"
];

export const mockPlaylists = [
  {
    id: 1,
    name: "Mi Lista Principal",
    url: "https://example.com/playlist1.m3u8",
    channelCount: 150,
    lastUpdated: "2025-01-15T10:30:00Z"
  },
  {
    id: 2, 
    name: "Deportes Premium",
    url: "https://example.com/sports-premium.m3u8",
    channelCount: 45,
    lastUpdated: "2025-01-14T18:20:00Z"
  }
];