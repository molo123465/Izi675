import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { useToast } from '../hooks/use-toast';
import axios from 'axios';
import Hls from 'hls.js';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize,
  Upload,
  Link,
  Tv,
  Signal,
  SignalZero,
  Menu,
  Search,
  X,
  RotateCcw,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const IPTVPlayer = () => {
  const [channels, setChannels] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [categories, setCategories] = useState(['Todos']);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [searchTerm, setSearchTerm] = useState('');
  const [playlists, setPlaylists] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showChannelList, setShowChannelList] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasTestChannels, setHasTestChannels] = useState(false);
  
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  // Load initial data
  useEffect(() => {
    loadPlaylists();
    loadChannels();
    loadCategories();
    checkForTestChannels();
  }, []);

  // Setup HLS when channel changes
  useEffect(() => {
    if (currentChannel && videoRef.current) {
      setupVideoPlayer();
    }
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentChannel]);

  const checkForTestChannels = async () => {
    try {
      const response = await axios.get(`${API}/playlists/channels`);
      if (response.data.length === 0) {
        setHasTestChannels(false);
      } else {
        setHasTestChannels(true);
      }
    } catch (error) {
      setHasTestChannels(false);
    }
  };

  const addTestChannels = async () => {
    setIsLoading(true);
    toast({
      title: "Agregando canales de prueba",
      description: "Instalando IPTV gratuitos para probar...",
    });

    const testM3U = `#EXTM3U
#EXTINF:-1 tvg-id="BigBuckBunny" tvg-name="Big Buck Bunny" tvg-logo="https://via.placeholder.com/100x60/FF6B6B/FFFFFF?text=BBB" group-title="Pruebas",Big Buck Bunny (Prueba)
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
#EXTINF:-1 tvg-id="Sintel" tvg-name="Sintel" tvg-logo="https://via.placeholder.com/100x60/4ECDC4/FFFFFF?text=SIN" group-title="Pruebas",Sintel (Prueba)
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4
#EXTINF:-1 tvg-id="ElephantsDream" tvg-name="Elephants Dream" tvg-logo="https://via.placeholder.com/100x60/45B7D1/FFFFFF?text=ED" group-title="Pruebas",Elephants Dream (Prueba)
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4
#EXTINF:-1 tvg-id="NASA" tvg-name="NASA Live" tvg-logo="https://via.placeholder.com/100x60/F7DC6F/000000?text=NASA" group-title="Ciencia",NASA Live
https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8
#EXTINF:-1 tvg-id="RT" tvg-name="RT Documentary" tvg-logo="https://via.placeholder.com/100x60/BB8FCE/FFFFFF?text=RT" group-title="Documentales",RT Documentary
https://rt-rtd.rttv.com/live/rtdoc/playlist.m3u8
#EXTINF:-1 tvg-id="Bloomberg" tvg-name="Bloomberg TV" tvg-logo="https://via.placeholder.com/100x60/58D68D/FFFFFF?text=BLOOM" group-title="Noticias",Bloomberg TV
https://bloomberg.com/media-manifest/streams/qt.m3u8
#EXTINF:-1 tvg-id="RedBull" tvg-name="Red Bull TV" tvg-logo="https://via.placeholder.com/100x60/E74C3C/FFFFFF?text=RB" group-title="Deportes",Red Bull TV
https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8
#EXTINF:-1 tvg-id="Euronews" tvg-name="Euronews" tvg-logo="https://via.placeholder.com/100x60/3498DB/FFFFFF?text=EURO" group-title="Noticias",Euronews
https://rakuten-euronews-1-gb.samsung.wurl.com/manifest/playlist.m3u8`;

    try {
      const formData = new FormData();
      const blob = new Blob([testM3U], { type: 'text/plain' });
      formData.append('file', blob, 'canales_prueba.m3u');
      formData.append('name', 'Canales de Prueba Gratuitos');

      await axios.post(`${API}/playlists/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      await loadPlaylists();
      await loadChannels();
      await loadCategories();
      setHasTestChannels(true);
      
      toast({
        title: "✅ Canales agregados",
        description: "8 canales de prueba instalados correctamente",
      });
    } catch (error) {
      console.error('Error adding test channels:', error);
      toast({
        title: "Error",
        description: "No se pudieron agregar los canales de prueba",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setupVideoPlayer = () => {
    if (!currentChannel || !videoRef.current) return;

    setVideoError(null);
    setIsBuffering(true);

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const video = videoRef.current;
    const url = currentChannel.url;

    // Check if HLS is supported
    if (url.includes('.m3u8')) {
      if (Hls.isSupported()) {
        // Use HLS.js for better M3U8 support
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 600,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.5,
        });

        hlsRef.current = hls;

        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('HLS manifest loaded');
          setIsBuffering(false);
          video.play().catch(console.error);
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS error:', data);
          setVideoError('Error de reproducción');
          setIsBuffering(false);
          setIsPlaying(false);
        });

        hls.on(Hls.Events.BUFFER_APPENDING, () => {
          setIsBuffering(true);
        });

        hls.on(Hls.Events.BUFFER_APPENDED, () => {
          setIsBuffering(false);
        });

      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        video.src = url;
        video.addEventListener('loadedmetadata', () => {
          setIsBuffering(false);
          video.play().catch(console.error);
        });
      } else {
        setVideoError('Tu navegador no soporta streaming HLS');
        setIsBuffering(false);
      }
    } else {
      // Direct video source
      video.src = url;
      video.addEventListener('loadeddata', () => {
        setIsBuffering(false);
        video.play().catch(console.error);
      });
    }

    // Video event listeners
    video.addEventListener('play', () => setIsPlaying(true));
    video.addEventListener('pause', () => setIsPlaying(false));
    video.addEventListener('waiting', () => setIsBuffering(true));
    video.addEventListener('playing', () => setIsBuffering(false));
    video.addEventListener('error', () => {
      setVideoError('Error al cargar el video');
      setIsBuffering(false);
      setIsPlaying(false);
    });

    // Set volume
    video.volume = volume;
    video.muted = isMuted;
  };

  const loadPlaylists = async () => {
    try {
      const response = await axios.get(`${API}/playlists/`);
      setPlaylists(response.data);
    } catch (error) {
      console.error('Error loading playlists:', error);
    }
  };

  const loadChannels = async () => {
    try {
      const response = await axios.get(`${API}/playlists/channels`, {
        params: {
          category: selectedCategory !== 'Todos' ? selectedCategory : undefined,
          search: searchTerm || undefined
        }
      });
      setChannels(response.data);
    } catch (error) {
      console.error('Error loading channels:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await axios.get(`${API}/playlists/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  // Reload channels when filters change
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      loadChannels();
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [selectedCategory, searchTerm]);

  const filteredChannels = channels;

  const handleChannelSelect = (channel) => {
    setCurrentChannel(channel);
    setShowChannelList(false);
    toast({
      title: "🎬 Canal seleccionado",
      description: `Cargando: ${channel.name}`,
    });
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(console.error);
      }
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const handleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const fileName = file.name;
      if (fileName.endsWith('.m3u') || fileName.endsWith('.m3u8')) {
        setIsLoading(true);
        toast({
          title: "📤 Subiendo archivo",
          description: `Procesando: ${fileName}`,
        });
        
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('name', fileName);

          const response = await axios.post(`${API}/playlists/upload`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          await loadPlaylists();
          await loadChannels();
          await loadCategories();
          setHasTestChannels(true);
          
          setShowUpload(false);
          toast({
            title: "✅ ¡Listo!",
            description: `${response.data.channel_count} canales agregados`,
          });
        } catch (error) {
          console.error('Error uploading file:', error);
          toast({
            title: "❌ Error",
            description: error.response?.data?.detail || "Error al procesar archivo",
            variant: "destructive"
          });
        } finally {
          setIsLoading(false);
        }
      } else {
        toast({
          title: "❌ Archivo inválido",
          description: "Solo archivos .m3u y .m3u8",
          variant: "destructive"
        });
      }
    }
  };

  const handleUrlSubmit = async () => {
    if (urlInput.trim()) {
      if (urlInput.includes('.m3u')) {
        setIsLoading(true);
        toast({
          title: "🔗 Procesando URL",
          description: "Descargando lista...",
        });
        
        try {
          const response = await axios.post(`${API}/playlists/url`, {
            name: `Lista URL - ${new Date().toLocaleDateString()}`,
            url: urlInput
          });

          await loadPlaylists();
          await loadChannels();
          await loadCategories();
          setHasTestChannels(true);
          
          setUrlInput('');
          setShowUpload(false);
          toast({
            title: "✅ ¡Descargado!",
            description: `${response.data.channel_count} canales agregados`,
          });
        } catch (error) {
          console.error('Error processing URL:', error);
          toast({
            title: "❌ Error de URL",
            description: error.response?.data?.detail || "URL inválida o inaccesible",
            variant: "destructive"
          });
        } finally {
          setIsLoading(false);
        }
      } else {
        toast({
          title: "❌ URL inválida",
          description: "Debe contener .m3u o .m3u8",
          variant: "destructive"
        });
      }
    }
  };

  const handleDeletePlaylist = async (playlistId) => {
    try {
      await axios.delete(`${API}/playlists/${playlistId}`);
      await loadPlaylists();
      await loadChannels();
      await loadCategories();
      await checkForTestChannels();
      toast({
        title: "🗑️ Lista eliminada",
        description: "Playlist eliminada correctamente",
      });
    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast({
        title: "❌ Error",
        description: "No se pudo eliminar",
        variant: "destructive"
      });
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if (videoRef.current.webkitRequestFullscreen) {
        videoRef.current.webkitRequestFullscreen();
      } else if (videoRef.current.mozRequestFullScreen) {
        videoRef.current.mozRequestFullScreen();
      }
    }
  };

  const ChannelList = ({ isMobile = false }) => (
    <div className={`${isMobile ? 'h-full' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-purple-300">📺 Canales ({filteredChannels.length})</h2>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
            className="border-purple-400 hover:bg-purple-500/30 text-purple-300"
          >
            <Search className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUpload(!showUpload)}
            className="border-purple-400 hover:bg-purple-500/30 text-purple-300"
          >
            <Upload className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* No channels message */}
      {filteredChannels.length === 0 && !hasTestChannels && (
        <div className="text-center py-6 mb-4">
          <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-6">
            <Tv className="w-12 h-12 mx-auto mb-3 text-purple-400" />
            <h3 className="text-lg font-semibold text-purple-300 mb-2">¡Bienvenido!</h3>
            <p className="text-purple-200 mb-4">No tienes canales todavía</p>
            <Button
              onClick={addTestChannels}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
            >
              {isLoading ? (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {isLoading ? 'Instalando...' : 'Instalar Canales de Prueba'}
            </Button>
          </div>
        </div>
      )}

      {/* Upload Section */}
      {showUpload && (
        <div className="mb-4 p-4 bg-purple-500/20 rounded-lg border border-purple-400/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-purple-300">📁 Agregar Lista</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUpload(false)}
              className="text-purple-300 hover:bg-purple-500/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Tabs defaultValue="file" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-black/50">
              <TabsTrigger value="file" className="text-purple-300">📄 Archivo</TabsTrigger>
              <TabsTrigger value="url" className="text-purple-300">🔗 URL</TabsTrigger>
            </TabsList>
            <TabsContent value="file" className="space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".m3u,.m3u8"
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 font-semibold"
              >
                {isLoading ? (
                  <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {isLoading ? 'Procesando...' : 'Subir M3U/M3U8'}
              </Button>
            </TabsContent>
            <TabsContent value="url" className="space-y-3">
              <Input
                placeholder="https://ejemplo.com/lista.m3u8"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="bg-black/30 border-purple-400/50 text-purple-100 placeholder-purple-300/50"
              />
              <Button
                onClick={handleUrlSubmit}
                disabled={isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 font-semibold"
              >
                {isLoading ? (
                  <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Link className="w-4 h-4 mr-2" />
                )}
                {isLoading ? 'Procesando...' : 'Agregar URL'}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Search */}
      {showSearch && (
        <div className="mb-4">
          <Input
            placeholder="🔍 Buscar canales..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-black/30 border-purple-400/50 text-purple-100 placeholder-purple-300/50"
          />
        </div>
      )}

      {/* Categories */}
      {categories.length > 1 && (
        <ScrollArea className="h-16 mb-4">
          <div className="flex space-x-2 pb-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={`whitespace-nowrap font-medium ${selectedCategory === category 
                  ? "bg-purple-600 hover:bg-purple-700 text-white" 
                  : "border-purple-400/50 hover:bg-purple-500/30 text-purple-300"
                }`}
              >
                {category}
              </Button>
            ))}
          </div>
        </ScrollArea>
      )}

      {categories.length > 1 && <Separator className="bg-purple-500/30 mb-4" />}

      {/* Channel List */}
      <ScrollArea className={`${isMobile ? 'h-96' : 'h-80'}`}>
        <div className="space-y-3">
          {filteredChannels.map((channel) => (
            <Card
              key={channel.id}
              className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                currentChannel?.id === channel.id
                  ? 'bg-purple-600/60 border-purple-300 shadow-lg shadow-purple-500/30'
                  : 'bg-black/30 border-purple-500/30 hover:bg-purple-500/20 hover:border-purple-400/70'
              }`}
              onClick={() => handleChannelSelect(channel)}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-purple-400/30">
                    {channel.logo ? (
                      <img
                        src={channel.logo}
                        alt={channel.name}
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <Tv className="w-5 h-5 text-purple-400" style={{ display: channel.logo ? 'none' : 'flex' }} />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="font-semibold truncate text-purple-100 text-base">{channel.name}</h4>
                    <p className="text-sm text-purple-300/70">{channel.category}</p>
                  </div>
                  <Badge 
                    variant={channel.is_live !== false ? "default" : "secondary"}
                    className={`text-xs flex-shrink-0 font-semibold ${
                      channel.is_live !== false 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-600 text-gray-300'
                    }`}
                  >
                    {channel.is_live !== false ? (
                      <>
                        <Signal className="w-3 h-3 mr-1" />
                        EN VIVO
                      </>
                    ) : (
                      <>
                        <SignalZero className="w-3 h-3 mr-1" />
                        OFFLINE
                      </>
                    )}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Mobile Header */}
      <div className="lg:hidden p-4 flex items-center justify-between border-b border-purple-500/30 bg-black/20 backdrop-blur-sm">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          🎬 IPTV Player
        </h1>
        <Sheet open={showChannelList} onOpenChange={setShowChannelList}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="border-purple-400 hover:bg-purple-500/30">
              <Menu className="w-4 h-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 bg-slate-900/95 border-purple-500/30">
            <ChannelList isMobile={true} />
          </SheetContent>
        </Sheet>
      </div>

      <div className="container mx-auto p-4">
        {/* Desktop Header */}
        <div className="hidden lg:block mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            🎬 Reproductor IPTV
          </h1>
          <p className="text-xl text-slate-300">Tu reproductor personal de canales en vivo - Transmisión fluida</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2 order-1">
            <Card className="bg-black/50 border-purple-500/40 backdrop-blur-lg shadow-2xl shadow-purple-500/20">
              <CardContent className="p-3 lg:p-6">
                <div className="relative aspect-video bg-black rounded-xl overflow-hidden mb-4 border border-purple-500/30">
                  {currentChannel ? (
                    <div className="w-full h-full flex items-center justify-center relative">
                      <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        playsInline
                        webkit-playsinline
                        controls={false}
                        autoPlay
                        muted={isMuted}
                      />
                      
                      {/* Loading/Buffering overlay */}
                      {(isBuffering || videoError) && (
                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                          {isBuffering && (
                            <div className="text-center">
                              <Loader className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-2" />
                              <p className="text-purple-300">Cargando...</p>
                            </div>
                          )}
                          {videoError && (
                            <div className="text-center">
                              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                              <p className="text-red-300">{videoError}</p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Channel info overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-lg lg:text-xl text-white drop-shadow-lg">
                              {currentChannel.name}
                            </h3>
                            <p className="text-sm lg:text-base text-purple-200 drop-shadow">
                              📂 {currentChannel.category}
                            </p>
                          </div>
                          <Badge 
                            variant={currentChannel.is_live !== false ? "default" : "secondary"}
                            className={`font-bold text-sm ${
                              currentChannel.is_live !== false 
                                ? 'bg-green-600 text-white shadow-lg' 
                                : 'bg-gray-600 text-gray-300'
                            }`}
                          >
                            {currentChannel.is_live !== false ? (
                              <>
                                <Signal className="w-4 h-4 mr-1" />
                                EN VIVO
                              </>
                            ) : (
                              <>
                                <SignalZero className="w-4 h-4 mr-1" />
                                OFFLINE
                              </>
                            )}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <Tv className="w-16 lg:w-20 h-16 lg:h-20 mx-auto mb-4 text-purple-400" />
                        <h3 className="text-xl lg:text-2xl font-bold mb-2 text-purple-200">
                          Selecciona un canal
                        </h3>
                        <p className="text-base lg:text-lg text-purple-300/70">
                          {window.innerWidth < 1024 ? "Toca el menú 📱 para ver canales" : "Elige un canal de la lista 👉"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Enhanced Player Controls */}
                <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-purple-500/30">
                  <div className="flex items-center space-x-3 lg:space-x-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePlayPause}
                      disabled={!currentChannel}
                      className="border-purple-400 hover:bg-purple-500/30 text-purple-300 font-semibold"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </Button>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMute}
                        disabled={!currentChannel}
                        className="border-purple-400 hover:bg-purple-500/30 text-purple-300"
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </Button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-20 lg:w-24 accent-purple-500"
                        disabled={!currentChannel}
                      />
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFullscreen}
                    disabled={!currentChannel}
                    className="border-purple-400 hover:bg-purple-500/30 text-purple-300"
                  >
                    <Maximize className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Desktop Channel Panel */}
          <div className="hidden lg:block order-2">
            <Card className="bg-black/50 border-purple-500/40 backdrop-blur-lg shadow-2xl shadow-purple-500/20">
              <CardHeader>
                <ChannelList />
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Mobile Quick Access */}
        <div className="lg:hidden mt-6">
          <div className="flex justify-center space-x-4">
            <Button
              onClick={() => setShowChannelList(true)}
              className="bg-purple-600 hover:bg-purple-700 font-semibold text-lg px-6 py-3"
            >
              <Tv className="w-5 h-5 mr-2" />
              Ver Canales ({filteredChannels.length})
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowUpload(true)}
              className="border-purple-400 hover:bg-purple-500/30 text-purple-300 font-semibold px-6 py-3"
            >
              <Upload className="w-5 h-5 mr-2" />
              Agregar
            </Button>
          </div>
        </div>

        {/* Enhanced Playlists Section */}
        <div className="mt-8 order-3">
          <Card className="bg-black/50 border-purple-500/40 backdrop-blur-lg shadow-2xl shadow-purple-500/20">
            <CardHeader>
              <CardTitle className="text-2xl lg:text-3xl font-bold text-purple-300">
                📁 Mis Listas ({playlists.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {playlists.length === 0 ? (
                <div className="text-center py-8 text-purple-300">
                  <Upload className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No hay listas agregadas</h3>
                  <p className="text-purple-400">Sube un archivo M3U o agrega una URL para comenzar</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {playlists.map((playlist) => (
                    <Card
                      key={playlist.id}
                      className="bg-black/30 border-purple-500/30 hover:bg-purple-500/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-bold text-base lg:text-lg truncate flex-grow text-purple-200">
                            {playlist.name}
                          </h3>
                          <div className="flex space-x-1 ml-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePlaylist(playlist.id)}
                              className="p-1 h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-sm text-purple-300/80 space-y-2">
                          <div className="flex items-center">
                            <Tv className="w-4 h-4 mr-2" />
                            <span className="font-semibold">{playlist.channel_count} canales</span>
                          </div>
                          <div className="flex items-center">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            <span>Actualizado: {new Date(playlist.last_updated).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default IPTVPlayer;