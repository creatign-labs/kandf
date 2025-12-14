import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
  poster?: string;
}

export const VideoPlayer = ({ videoUrl, title, poster }: VideoPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(80);
  const [showControls, setShowControls] = useState(true);

  // Check if it's a YouTube URL
  const isYouTube = videoUrl?.includes('youtube.com') || videoUrl?.includes('youtu.be');
  
  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.includes('youtu.be') 
      ? url.split('/').pop() 
      : new URLSearchParams(new URL(url).search).get('v');
    return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`;
  };

  if (!videoUrl) {
    return (
      <Card className="aspect-video bg-muted flex items-center justify-center border-border/60">
        <div className="text-center">
          <Play className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No video available</p>
        </div>
      </Card>
    );
  }

  if (isYouTube) {
    return (
      <Card className="overflow-hidden border-border/60">
        <div className="aspect-video">
          <iframe
            src={getYouTubeEmbedUrl(videoUrl)}
            title={title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </Card>
    );
  }

  // HTML5 Video Player
  return (
    <Card 
      className="overflow-hidden border-border/60 relative group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => !isPlaying && setShowControls(true)}
    >
      <div className="aspect-video bg-black relative">
        <video
          className="w-full h-full object-contain"
          src={videoUrl}
          poster={poster}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={(e) => {
            const video = e.currentTarget;
            setProgress((video.currentTime / video.duration) * 100);
          }}
          muted={isMuted}
          onClick={(e) => {
            const video = e.currentTarget;
            if (video.paused) {
              video.play();
            } else {
              video.pause();
            }
          }}
        />

        {/* Play overlay when paused */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Button
              size="lg"
              className="rounded-full h-16 w-16"
              onClick={(e) => {
                e.stopPropagation();
                const video = e.currentTarget.closest('.group')?.querySelector('video');
                video?.play();
              }}
            >
              <Play className="h-8 w-8 ml-1" />
            </Button>
          </div>
        )}

        {/* Controls */}
        <div 
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Progress bar */}
          <Slider
            value={[progress]}
            max={100}
            step={0.1}
            className="mb-4"
            onValueChange={([value]) => {
              const video = document.querySelector('video');
              if (video) {
                video.currentTime = (value / 100) * video.duration;
              }
            }}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => {
                  const video = document.querySelector('video');
                  if (video) video.currentTime -= 10;
                }}
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => {
                  const video = document.querySelector('video');
                  if (video) {
                    if (video.paused) video.play();
                    else video.pause();
                  }
                }}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => {
                  const video = document.querySelector('video');
                  if (video) video.currentTime += 10;
                }}
              >
                <SkipForward className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              
              <div className="w-24">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={100}
                  step={1}
                  onValueChange={([value]) => {
                    setVolume(value);
                    setIsMuted(value === 0);
                    const video = document.querySelector('video');
                    if (video) video.volume = value / 100;
                  }}
                />
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => {
                const video = document.querySelector('video');
                video?.requestFullscreen();
              }}
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
