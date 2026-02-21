/**
 * Face Detection Hook for Liveness Verification
 * Uses browser's getUserMedia for real camera access
 * Detects basic face movements for liveness challenges
 */

import { useState, useRef, useCallback, useEffect } from "react";

interface FaceDetectionResult {
  faceDetected: boolean;
  faceCount: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

interface LivenessChallenge {
  id: string;
  type: "blink" | "turn_left" | "turn_right" | "smile" | "nod";
  instruction: string;
  completed: boolean;
}

export function useFaceDetection() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);

  const [isActive, setIsActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [motionDetected, setMotionDetected] = useState(false);
  const [previousFrame, setPreviousFrame] = useState<ImageData | null>(null);

  // Start camera
  const startCamera = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsActive(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Camera access error:", error);
      return false;
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    setIsActive(false);
    setFaceDetected(false);
  }, []);

  // Simple motion detection by comparing frames
  const detectMotion = useCallback(
    (currentFrame: ImageData): boolean => {
      if (!previousFrame) {
        setPreviousFrame(currentFrame);
        return false;
      }

      let diffPixels = 0;
      const threshold = 30;
      const minMotionPercent = 0.02; // 2% of pixels must change

      for (let i = 0; i < currentFrame.data.length; i += 4) {
        const rDiff = Math.abs(currentFrame.data[i] - previousFrame.data[i]);
        const gDiff = Math.abs(
          currentFrame.data[i + 1] - previousFrame.data[i + 1],
        );
        const bDiff = Math.abs(
          currentFrame.data[i + 2] - previousFrame.data[i + 2],
        );

        if (rDiff > threshold || gDiff > threshold || bDiff > threshold) {
          diffPixels++;
        }
      }

      const motionPercent = diffPixels / (currentFrame.data.length / 4);
      setPreviousFrame(currentFrame);

      return motionPercent > minMotionPercent;
    },
    [previousFrame],
  );

  // Capture frame and detect face/motion
  const captureAndAnalyze = useCallback((): FaceDetectionResult & {
    motion: boolean;
  } => {
    if (!videoRef.current || !canvasRef.current) {
      return { faceDetected: false, faceCount: 0, motion: false };
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return { faceDetected: false, faceCount: 0, motion: false };
    }

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    ctx.drawImage(video, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Simple skin color detection for face presence
    let skinPixels = 0;
    const centerRegion = {
      startX: Math.floor(canvas.width * 0.25),
      endX: Math.floor(canvas.width * 0.75),
      startY: Math.floor(canvas.height * 0.1),
      endY: Math.floor(canvas.height * 0.7),
    };

    for (let y = centerRegion.startY; y < centerRegion.endY; y++) {
      for (let x = centerRegion.startX; x < centerRegion.endX; x++) {
        const i = (y * canvas.width + x) * 4;
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];

        // Simple skin color detection (works for various skin tones)
        if (
          r > 60 &&
          g > 40 &&
          b > 20 &&
          r > g &&
          r > b &&
          Math.abs(r - g) > 15 &&
          r - b > 15
        ) {
          skinPixels++;
        }
      }
    }

    const regionPixels =
      (centerRegion.endX - centerRegion.startX) *
      (centerRegion.endY - centerRegion.startY);
    const skinPercent = skinPixels / regionPixels;

    // Face detected if sufficient skin-tone pixels in center
    const detected = skinPercent > 0.15;
    const motion = detectMotion(imageData);

    setFaceDetected(detected);
    setMotionDetected(motion);

    return {
      faceDetected: detected,
      faceCount: detected ? 1 : 0,
      motion,
      boundingBox: detected
        ? {
            x: centerRegion.startX,
            y: centerRegion.startY,
            width: centerRegion.endX - centerRegion.startX,
            height: centerRegion.endY - centerRegion.startY,
          }
        : undefined,
    };
  }, [detectMotion]);

  // Start continuous detection
  const startDetection = useCallback(
    (onFrame: (result: FaceDetectionResult & { motion: boolean }) => void) => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }

      detectionIntervalRef.current = window.setInterval(() => {
        const result = captureAndAnalyze();
        onFrame(result);
      }, 200); // 5 FPS for detection
    },
    [captureAndAnalyze],
  );

  // Stop detection
  const stopDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      stopDetection();
    };
  }, [stopCamera, stopDetection]);

  // Take snapshot
  const takeSnapshot = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return null;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0);

    return canvas.toDataURL("image/jpeg", 0.8);
  }, []);

  return {
    videoRef,
    canvasRef,
    isActive,
    faceDetected,
    motionDetected,
    startCamera,
    stopCamera,
    captureAndAnalyze,
    startDetection,
    stopDetection,
    takeSnapshot,
  };
}
