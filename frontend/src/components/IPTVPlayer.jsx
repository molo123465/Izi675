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
  RotateCcw
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
  const [showChannelList, setShowChannelList] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
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
    setShowChannelList(false);
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

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const fileName = file.name;
      if (fileName.endsWith('.m3u') || fileName.endsWith('.m3u8')) {
        setIsLoading(true);
        toast({
          title: "Subiendo archivo",
          description: `Procesando lista: ${fileName}`,
        });
        
        // Simular carga y procesamiento
        setTimeout(() => {
          const newPlaylist = {
            id: playlists.length + 1,
            name: fileName,
            url: `uploaded/${fileName}`,
            channelCount: Math.floor(Math.random() * 200) + 50,
            lastUpdated: new Date().toISOString()
          };
          setPlaylists([...playlists, newPlaylist]);
          setShowUpload(false);
          setIsLoading(false);
          toast({
            title: "✅ Archivo procesado",
            description: `${newPlaylist.channelCount} canales agregados exitosamente`,
          });
        }, 2000);
      } else {
        toast({
          title: "Error",
          description: "Solo se permiten archivos .m3u y .m3u8",
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
          title: "Procesando URL",
          description: "Descargando lista desde URL",
        });
        
        // Simular procesamiento de URL
        setTimeout(() => {
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
          setIsLoading(false);
          toast({
            title: "✅ URL procesada",
            description: `${newPlaylist.channelCount} canales agregados desde URL`,
          });
        }, 2500);
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
        <h2 className="text-lg font-semibold">Canales</h2>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
            className="border-purple-500/50 hover:bg-purple-500/20"
          >
            <Search className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUpload(!showUpload)}
            className="border-purple-500/50 hover:bg-purple-500/20"
          >
            <Upload className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Upload Section */}
      {showUpload && (
        <div className="mb-4 p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Agregar Lista</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUpload(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
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
                disabled={isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isLoading ? (
                  <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {isLoading ? 'Procesando...' : 'Subir M3U/M3U8'}
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
                disabled={isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700"
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
            placeholder="Buscar canales..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-black/20 border-purple-500/50"
          />
        </div>
      )}

      {/* Categories */}
      <ScrollArea className="h-16 mb-4">
        <div className="flex space-x-2 pb-2">
          {mockCategories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className={`whitespace-nowrap ${selectedCategory === category 
                ? "bg-purple-600 hover:bg-purple-700" 
                : "border-purple-500/50 hover:bg-purple-500/20"
              }`}
            >
              {category}
            </Button>
          ))}
        </div>
      </ScrollArea>

      <Separator className="bg-purple-500/30 mb-4" />

      {/* Channel List */}
      <ScrollArea className={`${isMobile ? 'h-96' : 'h-80'}`}>
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
                    className="w-12 h-8 object-cover rounded flex-shrink-0"
                  />
                  <div className="flex-grow min-w-0">
                    <h4 className="font-medium truncate text-sm">{channel.name}</h4>
                    <p className="text-xs text-gray-400">{channel.category}</p>
                  </div>
                  <Badge 
                    variant={channel.isLive ? "default" : "secondary"}
                    className="text-xs flex-shrink-0"
                  >
                    {channel.isLive ? 'LIVE' : 'OFF'}
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
      <div className="lg:hidden p-4 flex items-center justify-between border-b border-purple-500/30">
        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          IPTV Player
        </h1>
        <Sheet open={showChannelList} onOpenChange={setShowChannelList}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="border-purple-500/50">
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Reproductor IPTV
          </h1>
          <p className="text-slate-300">Tu reproductor personal de canales en vivo</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2 order-1">
            <Card className="bg-black/40 border-purple-500/30 backdrop-blur-lg">
              <CardContent className="p-2 lg:p-4">
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-4">
                  {currentChannel ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        poster={currentChannel.logo}
                        controls={false}
                        playsInline
                        webkit-playsinline
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-2 lg:bottom-4 left-2 lg:left-4 right-2 lg:right-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-sm lg:text-lg truncate max-w-40 lg:max-w-none">
                              {currentChannel.name}
                            </h3>
                            <p className="text-xs lg:text-sm text-gray-300">{currentChannel.category}</p>
                          </div>
                          <Badge variant={currentChannel.isLive ? "default" : "secondary"}>
                            {currentChannel.isLive ? <Signal className="w-3 h-3 mr-1" /> : <SignalZero className="w-3 h-3 mr-1" />}
                            {currentChannel.isLive ? 'LIVE' : 'OFF'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <Tv className="w-12 lg:w-16 h-12 lg:h-16 mx-auto mb-4 text-purple-400" />
                        <h3 className="text-lg lg:text-xl font-semibold mb-2">Selecciona un canal</h3>
                        <p className="text-sm lg:text-base text-gray-400">
                          {window.innerWidth < 1024 ? "Toca el menú para ver canales" : "Elige un canal de la lista para comenzar"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Player Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 lg:space-x-4">
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
                        className="w-16 lg:w-20 accent-purple-500"
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

          {/* Desktop Channel Panel */}
          <div className="hidden lg:block order-2">
            <Card className="bg-black/40 border-purple-500/30 backdrop-blur-lg">
              <CardHeader>
                <ChannelList />
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Mobile Quick Access */}
        <div className="lg:hidden mt-4">
          <div className="flex justify-center space-x-4">
            <Button
              onClick={() => setShowChannelList(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Tv className="w-4 h-4 mr-2" />
              Ver Canales ({filteredChannels.length})
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowUpload(true)}
              className="border-purple-500/50 hover:bg-purple-500/20"
            >
              <Upload className="w-4 h-4 mr-2" />
              Agregar
            </Button>
          </div>
        </div>

        {/* Playlists Section */}
        <div className="mt-8 order-3">
          <Card className="bg-black/40 border-purple-500/30 backdrop-blur-lg">
            <CardHeader>
              <CardTitle className="text-lg lg:text-xl">Mis Listas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {playlists.map((playlist) => (
                  <Card
                    key={playlist.id}
                    className="bg-black/20 border-purple-500/20 hover:bg-purple-500/10 transition-colors cursor-pointer"
                  >
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2 text-sm lg:text-base truncate">{playlist.name}</h3>
                      <div className="text-xs lg:text-sm text-gray-400 space-y-1">
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