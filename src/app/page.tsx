"use client";
import { useState, useRef, useEffect } from "react";

interface IdentifiedObject {
    label: string;
    mask: string;
    score: number;
}

export default function Home() {
    const [theFile, setTheFile] = useState<File | undefined>(undefined);
    const [imagePreview, setImagePreview] = useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    const [apiResponse, setApiResponse] = useState<IdentifiedObject[]>([]);
    const [toShow, setToShow] = useState<IdentifiedObject | undefined>(undefined);
    const [showCamera, setShowCamera] = useState(false);
    const [highestAccuracyObject, setHighestAccuracyObject] = useState<string | undefined>(undefined);
    const [isFrontCamera, setIsFrontCamera] = useState(true); // State to toggle between cameras
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.currentTarget.files?.[0];
        if (!file) return;

        setTheFile(file);
        const blobUrl = URL.createObjectURL(file);
        setImagePreview(blobUrl);
    };

    const handleCapture = async () => {
        if (canvasRef.current && videoRef.current) {
            const canvas = canvasRef.current;
            const video = videoRef.current;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext("2d");
            context?.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert canvas image to blob (file)
            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], "captured_image.png", { type: "image/png" });
                    setTheFile(file);
                    const blobUrl = URL.createObjectURL(file);
                    setImagePreview(blobUrl);
                }
            });
            setShowCamera(false);
        }
    };

    const startCamera = async () => {
        setShowCamera(true);
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter((device) => device.kind === "videoinput");

            const selectedDevice = videoDevices.find((device) =>
                isFrontCamera ? device.label.toLowerCase().includes("front") : device.label.toLowerCase().includes("back")
            );

            const constraints = {
                video: {
                    deviceId: selectedDevice?.deviceId || undefined,
                },
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
        } catch (error) {
            console.error("Error accessing camera:", error);
        }
    };

    const toggleCamera = () => {
        setIsFrontCamera((prev) => !prev);
        startCamera(); // Restart camera with the new device
    };

    const identifyThings = async () => {
        if (!theFile) return;

        setIsLoading(true);
        const formData = new FormData();
        formData.set("theImage", theFile);

        try {
            const response = await fetch("/api", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                const theResponse = await response.json();
                setApiResponse(theResponse.body);
            } else {
                console.error("Failed to upload file");
            }
        } catch (error) {
            console.error("Error occurred during API call:", error);
        }

        setIsLoading(false);
    };

    function toggleThis(label: string) {
        const showThis = apiResponse.find((obj) => obj.label === label);
        setToShow((prev) => (prev === showThis ? undefined : showThis));
    }

    useEffect(() => {
        if (apiResponse.length > 0) {
            const highestScoreObject = apiResponse.reduce((maxObj, currentObj) =>
                currentObj.score > maxObj.score ? currentObj : maxObj
            );
            setHighestAccuracyObject(highestScoreObject.label);
        }
    }, [apiResponse]);

    return (
        <main className="flex min-h-screen bg-gray-900 flex-col items-center justify-center py-8">
            <h1 className="text-5xl font-bold text-white mb-8">AI-Dentifier</h1>

            <label className="relative cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md shadow-md transition">
                <input
                    type="file"
                    className="absolute inset-0 opacity-0"
                    onChange={handleFileChange}
                    accept="image/*"
                />
                Choose a File
            </label>

            <button
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 mt-4 rounded-md shadow-md transition"
                onClick={startCamera}
            >
                Capture with Camera
            </button>

            <button
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 mt-4 rounded-md shadow-md transition"
                onClick={toggleCamera}
            >
                Switch to {isFrontCamera ? "Rear" : "Front"} Camera
            </button>

            {showCamera && (
                <div className="mt-6">
                    <video ref={videoRef} className="w-80 h-80 bg-gray-800" />
                    <button
                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 mt-4 rounded-md shadow-lg transition"
                        onClick={handleCapture}
                    >
                        Capture Image
                    </button>
                    <canvas ref={canvasRef} className="hidden" />
                </div>
            )}

            <div className="w-80 h-80 mt-8 relative rounded-lg overflow-hidden shadow-lg bg-gray-800 flex items-center justify-center">
                {imagePreview ? (
                    <img src={imagePreview} className="object-cover w-full h-full" />
                ) : (
                    <span className="text-gray-500">No image uploaded</span>
                )}

                {toShow && (
                    <img
                        src={`data:image/png;base64,${toShow.mask}`}
                        className="object-cover absolute z-10 mix-blend-screen invert"
                    />
                )}
            </div>

            {theFile && (
                <button
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 mt-6 rounded-md shadow-lg transition disabled:bg-green-800"
                    onClick={identifyThings}
                    disabled={isLoading}
                >
                    {isLoading ? "Analyzing..." : "Go!"}
                </button>
            )}

            {apiResponse.length > 0 && (
                <div className="mt-10 w-full max-w-lg">
                    <div className="text-white text-lg mb-4 text-center">Identified objects:</div>
                    <div className="grid grid-cols-3 gap-4">
                        {apiResponse.map((e) => (
                            <button
                                key={e.label}
                                className={`px-4 py-2 rounded-md font-semibold text-white transition ${
                                    toShow?.label === e.label ? "bg-blue-600" : "bg-gray-700 hover:bg-blue-500"
                                }`}
                                onClick={() => toggleThis(e.label)}
                            >
                                {e.label} - {Math.round(e.score * 100)}%
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {highestAccuracyObject && (
                <div className="text-white text-lg mt-6">
                    The object detected is likely a <strong>{highestAccuracyObject}</strong>.
                </div>
            )}
        </main>
    );
}
