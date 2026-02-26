/**
 * Face Detection Hook for Liveness Verification
 * Uses browser's getUserMedia for real camera access
 * Detects basic face movements for liveness challenges
 */

import { useCallback } from 'react';
import { useCamera } from './use-camera';
import { useFaceAnalysis, FaceDetectionResult } from './use-face-analysis';

export type { FaceDetectionResult };

export function useFaceDetection() {
    const { videoRef, isActive, startCamera, stopCamera: stopCameraStream } = useCamera();
    const {
        canvasRef,
        faceDetected,
        motionDetected,
        captureAndAnalyze,
        startDetection,
        stopDetection,
        takeSnapshot,
        reset
    } = useFaceAnalysis(videoRef);

    const stopCamera = useCallback(() => {
        stopCameraStream();
        reset();
    }, [stopCameraStream, reset]);

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
        takeSnapshot
    };
}
