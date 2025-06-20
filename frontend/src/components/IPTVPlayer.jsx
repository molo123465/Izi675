import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { useToast } from '../hooks/use-toast';
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
  SignalZero
} from 'lucide-react';
import { mockChannels, mockCategories, mockPlaylists } from '../mock/mockData';

const IPTVPlayer = () => {
  const [channels, setChannels] = useState(mockChannels);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [searchTerm, setSearchTerm] = useState('');
  const [playlists, setPlaylists] = useState(mockPlaylists);
  const [showUpload, setShowUpload] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const filteredChannels = channels.filter(channel => {
    const matchesCategory = selectedCategory === 'Todos' || channel.category === selectedCategory;
    const matchesSearch = channel.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleChannelSelect = (channel) => {
    setCurrentChannel(channel);
    setIsPlaying(true);
    toast({
      title: "Canal seleccionado",
      description: `Reproduciendo: ${channel.name}`,
    });
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
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

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const fileName = file.name;
      if (fileName.endsWith('.m3u') || fileName.endsWith('.m3u8')) {
        // Simular procesamiento del archivo
        toast({
          title: "Archivo subido",
          description: `Procesando lista: ${fileName}`,
        });
        
        // Mock: agregar nueva playlist
        const newPlaylist = {
          id: playlists.length + 1,
          name: fileName,
          url: `mock://uploaded/${fileName}`,
          channelCount: Math.floor(Math.random() * 200) + 50,
          lastUpdated: new Date().toISOString()
        };
        setPlaylists([...playlists, newPlaylist]);
        setShowUpload(false);
      } else {
        toast({
          title: "Error",
          description: "Solo se permiten archivos .m3u y .m3u8",
          variant: "destructive"
        });
      }
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      if (urlInput.includes('.m3u')) {
        toast({
          title: "URL agregada",
          description: "Procesando lista desde URL",
        });
        
        const newPlaylist = {
          id: playlists.length + 1,
          name: `Lista desde URL`,
          url: urlInput,
          channelCount: Math.floor(Math.random() * 300) + 100,
          lastUpdated: new Date().toISOString()
        };
        setPlaylists([...playlists, newPlaylist]);
        setUrlInput('');
        setShowUpload(false);
      } else {
        toast({
          title: "Error",
          description: "La URL debe contener una lista M3U válida",
          variant: "destructive"
        });
      }
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="container mx-auto p-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Reproductor IPTV
          </h1>
          <p className="text-slate-300">Tu reproductor personal de canales en vivo</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Reproductor de Video */}
          <div className="lg:col-span-2">
            <Card className="bg-black/40 border-purple-500/30 backdrop-blur-lg">
              <CardContent className="p-4">
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-4">
                  {currentChannel ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        poster={currentChannel.logo}
                        controls={false}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{currentChannel.name}</h3>
                            <p className="text-sm text-gray-300">{currentChannel.category}</p>
                          </div>
                          <Badge variant={currentChannel.isLive ? "default" : "secondary"}>
                            {currentChannel.isLive ? <Signal className="w-3 h-3 mr-1" /> : <SignalZero className="w-3 h-3 mr-1" />}
                            {currentChannel.isLive ? 'EN VIVO' : 'OFFLINE'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <Tv className="w-16 h-16 mx-auto mb-4 text-purple-400" />
                        <h3 className="text-xl font-semibold mb-2">Selecciona un canal</h3>
                        <p className="text-gray-400">Elige un canal de la lista para comenzar a ver</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Controles del reproductor */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePlayPause}
                      disabled={!currentChannel}
                      className="border-purple-500/50 hover:bg-purple-500/20"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMute}
                        disabled={!currentChannel}
                        className="border-purple-500/50 hover:bg-purple-500/20"
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
                        className="w-20 accent-purple-500"
                        disabled={!currentChannel}
                      />
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFullscreen}
                    disabled={!currentChannel}
                    className="border-purple-500/50 hover:bg-purple-500/20"
                  >
                    <Maximize className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panel de Canales */}
          <div>
            <Card className="bg-black/40 border-purple-500/30 backdrop-blur-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Canales</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUpload(!showUpload)}
                    className="border-purple-500/50 hover:bg-purple-500/20"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Agregar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Upload Section */}
                {showUpload && (
                  <div className="mb-4 p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                    <Tabs defaultValue="file" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 bg-black/40">
                        <TabsTrigger value="file">Archivo</TabsTrigger>
                        <TabsTrigger value="url">URL</TabsTrigger>
                      </TabsList>
                      <TabsContent value="file" className="space-y-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          accept=".m3u,.m3u8"
                          className="hidden"
                        />
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full bg-purple-600 hover:bg-purple-700"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Subir M3U/M3U8
                        </Button>
                      </TabsContent>
                      <TabsContent value="url" className="space-y-2">
                        <Input
                          placeholder="https://ejemplo.com/lista.m3u8"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          className="bg-black/20 border-purple-500/50"
                        />
                        <Button
                          onClick={handleUrlSubmit}
                          className="w-full bg-purple-600 hover:bg-purple-700"
                        >
                          <Link className="w-4 h-4 mr-2" />
                          Agregar URL
                        </Button>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                {/* Search */}
                <Input
                  placeholder="Buscar canales..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-4 bg-black/20 border-purple-500/50"
                />

                {/* Categories */}
                <ScrollArea className="h-20 mb-4">
                  <div className="flex space-x-2 pb-2">
                    {mockCategories.map((category) => (
                      <Button
                        key={category}
                        variant={selectedCategory === category ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory(category)}
                        className={selectedCategory === category 
                          ? "bg-purple-600 hover:bg-purple-700" 
                          : "border-purple-500/50 hover:bg-purple-500/20"
                        }
                      >
                        {category}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>

                <Separator className="bg-purple-500/30 mb-4" />

                {/* Channel List */}
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {filteredChannels.map((channel) => (
                      <Card
                        key={channel.id}
                        className={`cursor-pointer transition-all duration-200 ${
                          currentChannel?.id === channel.id
                            ? 'bg-purple-600/40 border-purple-400'
                            : 'bg-black/20 border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-400/50'
                        }`}
                        onClick={() => handleChannelSelect(channel)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center space-x-3">
                            <img
                              src={channel.logo}
                              alt={channel.name}
                              className="w-12 h-8 object-cover rounded"
                            />
                            <div className="flex-grow min-w-0">
                              <h4 className="font-medium truncate">{channel.name}</h4>
                              <p className="text-sm text-gray-400">{channel.category}</p>
                            </div>
                            <Badge 
                              variant={channel.isLive ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {channel.isLive ? 'LIVE' : 'OFF'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Playlists Section */}
        <div className="mt-8">
          <Card className="bg-black/40 border-purple-500/30 backdrop-blur-lg">
            <CardHeader>
              <CardTitle>Mis Listas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {playlists.map((playlist) => (
                  <Card
                    key={playlist.id}
                    className="bg-black/20 border-purple-500/20 hover:bg-purple-500/10 transition-colors cursor-pointer"
                  >
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">{playlist.name}</h3>
                      <div className="text-sm text-gray-400 space-y-1">
                        <p>{playlist.channelCount} canales</p>
                        <p>Actualizado: {new Date(playlist.lastUpdated).toLocaleDateString()}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default IPTVPlayer;