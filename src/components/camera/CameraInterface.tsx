import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, Images, Zap, ZapOff, RotateCcw, Video, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface CameraInterfaceProps {
  onMediaCaptured: (media: { type: 'image' | 'video', data: string, file: File }) => void;
  onGallerySelect: () => void;
}

// Extended types for experimental camera APIs
interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
  zoom?: {
    min: number;
    max: number;
    step: number;
  };
  focusMode?: string[];
}

interface ExtendedMediaTrackConstraints extends MediaTrackConstraints {
  zoom?: number;
  focusMode?: string;
  pointsOfInterest?: Array<{ x: number; y: number }>;
}

const CameraInterface: React.FC<CameraInterfaceProps> = ({ onMediaCaptured, onGallerySelect }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [captureMode, setCaptureMode] = useState<'photo' | 'video'>('photo');
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<{ front: boolean; back: boolean }>({
    front: false,
    back: false
  });


  // Focus and zoom state
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showZoomIndicator, setShowZoomIndicator] = useState(false);
  const [maxZoom, setMaxZoom] = useState(3);
  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  const [isZooming, setIsZooming] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    // Check if we're on HTTPS or localhost
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      toast({
        title: "HTTPS Required",
        description: "Camera access requires HTTPS. Please use a secure connection.",
        variant: "destructive"
      });
      return;
    }
    
    checkCameraAvailability();
  }, []);

  useEffect(() => {
    if (permissionGranted) {
      startCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraFacing, captureMode, permissionGranted]);

  const checkCameraAvailability = async () => {
    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported');
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      const cameras = {
        front: videoDevices.some(device => 
          device.label.toLowerCase().includes('front') || 
          device.label.toLowerCase().includes('user')
        ),
        back: videoDevices.some(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('environment')
        )
      };

      // If we can't determine from labels, assume we have at least one camera
      if (videoDevices.length > 0 && !cameras.front && !cameras.back) {
        cameras.front = true;
        cameras.back = videoDevices.length > 1;
      }

      setAvailableCameras(cameras);
      
      // Prefer back camera if available
      if (cameras.back) {
        setCameraFacing('environment');
      } else if (cameras.front) {
        setCameraFacing('user');
      }

      await requestCameraPermission();
    } catch (error) {
      console.error('Error checking camera availability:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions and ensure you're using HTTPS.",
        variant: "destructive"
      });
    }
  };

  const requestCameraPermission = async () => {
    try {
      // Use more compatible constraints without "exact"
      const constraints = {
        video: {
          facingMode: cameraFacing === 'user' ? 'user' : 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: captureMode === 'video'
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setPermissionGranted(true);
      
      // Stop the test stream
      mediaStream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (error) {
      console.error('Permission denied or camera not available:', error);
      setPermissionGranted(false);
      
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          toast({
            title: "Camera Permission Required",
            description: "Please allow camera access to use this feature.",
            variant: "destructive"
          });
        } else if (error.name === 'NotFoundError') {
          toast({
            title: "Camera Not Found",
            description: `${cameraFacing === 'user' ? 'Front' : 'Back'} camera not available on this device.`,
            variant: "destructive"
          });
        } else if (error.name === 'OverconstrainedError') {
          toast({
            title: "Camera Constraint Error",
            description: `${cameraFacing === 'user' ? 'Front' : 'Back'} camera not available on this device.`,
            variant: "destructive"
          });
        }
      }
      
      return false;
    }
  };

  const startCamera = async () => {
    if (!permissionGranted) return;

    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      // Use more compatible constraints
      const constraints = {
        video: {
          facingMode: cameraFacing === 'user' ? 'user' : 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: captureMode === 'video'
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Get zoom capabilities with type assertion
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities() as ExtendedMediaTrackCapabilities;
        if (capabilities.zoom) {
          setMaxZoom(capabilities.zoom.max || 3);
        }
      }

      // Reset zoom when switching cameras
      setZoomLevel(1);
      
    } catch (error) {
      console.error('Error starting camera:', error);
      
      if (error instanceof DOMException) {
        if (error.name === 'OverconstrainedError' || error.name === 'NotFoundError') {
          // Try with basic constraints as fallback
          try {
            const fallbackConstraints = {
              video: true,
              audio: captureMode === 'video'
            };

            const fallbackStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
            setStream(fallbackStream);
            
            if (videoRef.current) {
              videoRef.current.srcObject = fallbackStream;
            }

            toast({
              title: "Camera Fallback",
              description: "Using available camera. Camera switching may be limited.",
              variant: "default"
            });
          } catch (fallbackError) {
            console.error('Fallback camera start failed:', fallbackError);
            toast({
              title: "Camera Error",
              description: `${cameraFacing === 'user' ? 'Front' : 'Back'} camera not available on this device.`,
              variant: "destructive"
            });
          }
        } else {
          toast({
            title: "Camera Error",
            description: "Unable to access camera. Please check permissions.",
            variant: "destructive"
          });
        }
      }
    }
  };

  const switchCamera = async () => {
    const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
    
    const targetAvailable = newFacing === 'user' ? availableCameras.front : availableCameras.back;
    
    if (!targetAvailable) {
      toast({
        title: "Camera Not Available",
        description: `${newFacing === 'user' ? 'Front' : 'Back'} camera not available on this device.`,
        variant: "destructive"
      });
      return;
    }

    setCameraFacing(newFacing);
  };

  const handleTapToFocus = useCallback(async (event: React.MouseEvent<HTMLDivElement>) => {
    if (!stream || isZooming) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setFocusPoint({ x, y });

    // Try to apply focus constraints with type assertion
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack && videoTrack.applyConstraints) {
      try {
        await videoTrack.applyConstraints({
          advanced: [{ focusMode: 'manual', pointsOfInterest: [{ x: x / 100, y: y / 100 }] } as any]
        });
      } catch (error) {
        // Fallback to continuous focus if manual focus fails
        try {
          await videoTrack.applyConstraints({
            advanced: [{ focusMode: 'continuous' } as any]
          });
        } catch (fallbackError) {
          console.log('Focus not supported on this device');
        }
      }
    }

    // Hide focus indicator after 2 seconds
    setTimeout(() => {
      setFocusPoint(null);
    }, 2000);
  }, [stream, isZooming]);

  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2) {
      setIsZooming(true);
      setLastTouchDistance(getTouchDistance(event.touches));
      setShowZoomIndicator(true);
    }
  }, []);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2 && isZooming) {
      event.preventDefault();
      const currentDistance = getTouchDistance(event.touches);
      
      if (lastTouchDistance > 0) {
        const scale = currentDistance / lastTouchDistance;
        const newZoom = Math.min(Math.max(zoomLevel * scale, 1), maxZoom);
        setZoomLevel(newZoom);
        
        // Apply zoom to video track with type assertion
        if (stream) {
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack && videoTrack.applyConstraints) {
            try {
              videoTrack.applyConstraints({
                advanced: [{ zoom: newZoom } as any]
              });
            } catch (error) {
              // Fallback to CSS zoom if native zoom fails
              if (videoRef.current) {
                videoRef.current.style.transform = `scale(${newZoom}) ${cameraFacing === 'user' ? 'scaleX(-1)' : ''}`;
              }
            }
          }
        }
      }
      
      setLastTouchDistance(currentDistance);
    }
  }, [isZooming, lastTouchDistance, zoomLevel, maxZoom, stream, cameraFacing]);

  const handleTouchEnd = useCallback(() => {
    setIsZooming(false);
    setLastTouchDistance(0);
    setTimeout(() => setShowZoomIndicator(false), 1000);
  }, []);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Apply autofocus before capturing
    if (stream && captureMode === 'photo') {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && videoTrack.applyConstraints) {
        try {
          await videoTrack.applyConstraints({
            advanced: [{ focusMode: 'single-shot' } as any]
          });
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.log('Autofocus not supported, proceeding with capture');
        }
      }
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the video frame
    if (cameraFacing === 'user') {
      context.scale(-1, 1);
      context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    } else {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'captured-photo.jpg', { type: 'image/jpeg' });
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        onMediaCaptured({ type: 'image', data: dataUrl, file });
      }
    }, 'image/jpeg', 0.8);
  };

  const startVideoRecording = () => {
    if (!stream) return;

    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    const chunks: Blob[] = [];
    setRecordedChunks(chunks);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/mp4' });
      const file = new File([blob], 'captured-video.mp4', { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      onMediaCaptured({ type: 'video', data: url, file });
      setRecordedChunks([]);
    };

    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleCapture = () => {
    if (captureMode === 'photo') {
      capturePhoto();
    } else {
      if (isRecording) {
        stopVideoRecording();
      } else {
        startVideoRecording();
      }
    }
  };

  const toggleFlash = () => {
    setFlashEnabled(!flashEnabled);
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && 'applyConstraints' in videoTrack) {
        videoTrack.applyConstraints({
          advanced: [{ torch: !flashEnabled } as any]
        }).catch(() => {
          toast({
            title: "Flash not supported",
            description: "Flash is not available on this device",
            variant: "destructive"
          });
        });
      }
    }
  };

  const toggleCaptureMode = () => {
    setCaptureMode(captureMode === 'photo' ? 'video' : 'photo');
  };

  if (!permissionGranted) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-center text-white p-6">
          <Camera size={48} className="mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Camera Access Required</h2>
          <p className="text-gray-300 mb-4">
            {location.protocol !== 'https:' && location.hostname !== 'localhost'
              ? 'Camera access requires HTTPS. Please use a secure connection.'
              : 'Please allow camera access to continue'
            }
          </p>
          <Button 
            onClick={requestCameraPermission}
            className="bg-blue-500 hover:bg-blue-600"
            disabled={location.protocol !== 'https:' && location.hostname !== 'localhost'}
          >
            Enable Camera
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Camera Preview */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        onClick={handleTapToFocus}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${
            cameraFacing === 'user' ? 'scale-x-[-1]' : ''
          }`}
        />
        
        
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Focus indicator */}
        {focusPoint && (
          <div 
            className="absolute pointer-events-none"
            style={{
              left: `${focusPoint.x}%`,
              top: `${focusPoint.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="w-16 h-16 border-2 border-white rounded-full animate-ping" />
            <div className="absolute inset-0 w-16 h-16 border-2 border-white rounded-full" />
          </div>
        )}
        
        {/* Zoom indicator */}
        {showZoomIndicator && (
          <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            {Math.round(zoomLevel * 100)}%
          </div>
        )}
        
        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            REC
          </div>
        )}
      </div>

      {/* Top Controls */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFlash}
            className="w-12 h-12 rounded-full bg-black/30 text-white hover:bg-black/50"
          >
            {flashEnabled ? <Zap size={24} /> : <ZapOff size={24} />}
          </Button>
          
          <div className="flex bg-black/50 rounded-full p-1">
            <button
              onClick={toggleCaptureMode}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                captureMode === 'photo' 
                  ? 'bg-white text-black' 
                  : 'text-white hover:bg-white/20'
              }`}
            >
              <Image size={16} className="inline mr-2" />
              PHOTO
            </button>
            <button
              onClick={toggleCaptureMode}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                captureMode === 'video' 
                  ? 'bg-white text-black' 
                  : 'text-white hover:bg-white/20'
              }`}
            >
              <Video size={16} className="inline mr-2" />
              VIDEO
            </button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={switchCamera}
            disabled={!availableCameras.front || !availableCameras.back}
            className="w-12 h-12 rounded-full bg-black/30 text-white hover:bg-black/50 disabled:opacity-50"
          >
            <RotateCcw size={24} />
          </Button>
        </div>
      </div>


      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          {/* Gallery button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onGallerySelect}
            className="w-12 h-12 rounded-full bg-black/30 text-white hover:bg-black/50"
          >
            <Images size={24} />
          </Button>

          {/* Main capture button */}
          <Button
            onClick={handleCapture}
            className={`w-20 h-20 rounded-full border-4 border-white p-0 transition-all duration-200 relative ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                : 'bg-transparent hover:bg-white/10'
            }`}
          >
            <div className="w-12 h-12 rounded-full transition-all duration-200 bg-white" />
          </Button>

          {/* Empty space for symmetry */}
          <div className="w-12 h-12"></div>
        </div>
      </div>
    </div>
  );
};

export default CameraInterface;
