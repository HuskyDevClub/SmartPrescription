import {createRoot} from 'react-dom/client';
import React, {useEffect, useRef, useState} from 'react';
import {Message} from "ollama";
import {OllamaController} from "./controllers/OllamaController";
import {MedicalPrescription} from "./models/MedicalPrescription";

const root = createRoot(document.body);
root.render(
    <Main/>
);

function Main() {
    const [prompt, setPrompt] = useState('');
    const [options, setOptions] = useState<string[]>([]);
    const [selectedModel, setSelectedModel] = useState('');
    const [responses, setResponses] = useState<string[]>([]);
    const [response, setResponse] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [attachments, setAttachments] = useState<string[]>([]);
    const [prescription, setPrescription] = useState<MedicalPrescription>(null);

    const [hasPermission, setHasPermission] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    // ask gpt the question
    async function askGpt(): Promise<void> {
        if (!prompt) {
            alert('Please select a model and enter a prompt.');
            return;
        }
        await chat(prompt);
        setPrompt("");
    }

    async function chat(thePrompt: string, question: string = null): Promise<void> {
        messages.push({role: "user", content: thePrompt, images: attachments} as Message);
        console.log(messages);
        responses.push("User:")
        responses.push(question == null ? thePrompt : question);
        responses.push(`AI (${selectedModel}):`)
        responses.push(await OllamaController.chatAsync(selectedModel, messages, setResponse))
        setAttachments([])
    }

    async function extractText(): Promise<void> {
        let thePrompt = "Extract all the text from the image."
        messages.push({role: "user", content: thePrompt, images: attachments} as Message);
        console.log(messages);
        responses.push("User:")
        responses.push(thePrompt);
        responses.push(`AI (${selectedModel}):`)
        responses.push(await OllamaController.chatAsync(selectedModel, messages, setResponse))
        setAttachments([])
    }

    async function getMedicineInfo(): Promise<void> {
        let thePrompt = 'Extract following information in json format, output only the json nothing else: {' +
            '"name": the name of the drug, "usage": how to use drug, "frequency": how many times per day, "notes": anything that need special attention' +
            '}'
        messages.push({role: "user", content: thePrompt} as Message);
        console.log(messages);
        responses.push("User:")
        responses.push(thePrompt);
        responses.push(`AI (${selectedModel}):`)
        const result = await OllamaController.chatAsync(selectedModel, messages, setResponse)
        try {
            const data = JSON.parse(result);
            setPrescription(data as MedicalPrescription);
        } catch (error) {
            console.log(error)
        }
        responses.push(result)
        setAttachments([])
    }

    async function clearHistory(): Promise<void> {
        setResponses([]);
        setMessages([]);
        setAttachments([]);
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            for (let i = 0; i < event.target.files.length; i++) {
                let reader = new FileReader();
                reader.readAsDataURL(event.target.files[i]);
                reader.onload = function () {
                    attachments.push(reader.result.toString().split(",")[1])
                };
                reader.onerror = function (error) {
                    console.log('Error: ', error);
                };
            }
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                setIsCameraActive(true);
                setHasPermission(true);
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            setHasPermission(false);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            const tracks = streamRef.current.getTracks();
            tracks.forEach((track: MediaStreamTrack) => track.stop());
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
            setIsCameraActive(false);
        }
    };

    const takePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            // Set canvas dimensions to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Draw the current video frame on the canvas
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert canvas to data URL and set as captured image
            const imageDataURL = canvas.toDataURL('image/png');
            setCapturedImage(imageDataURL);
            attachments.push(imageDataURL.split(',')[1]);
            console.log(imageDataURL);

            // Stop the camera
            stopCamera();
        }
    };

    const resetCapture = () => {
        setCapturedImage(null);
        startCamera();
    };
    // Fetch the models when the component mounts
    useEffect(() => {
        async function fetchModels(): Promise<void> {
            const models: string[] = await OllamaController.getModels();
            setOptions(models);
            setSelectedModel(models[0])
        }

        fetchModels().then(); // Call the async function
        return () => {
            // Clean up: stop camera when component unmounts
            stopCamera();
        };
    }, []); // Empty dependency array ensures it only runs once

    return (
        <div>
            <div hidden={responses.length === 0 && responses.length === 0}>
                <h2>Response:</h2>
                {responses.map((option, index) => (
                    <p key={index}>{option}</p>
                ))}
                <p>{response}</p>
            </div>
            <h2 hidden={responses.length != 0 || responses.length != 0}>What can I help with?</h2>
            <textarea placeholder="Message GPT Assistance" rows={10} cols={50} value={prompt}
                      onChange={e => setPrompt(e.target.value)}/><br/>
            <label className="form-label">Model: </label>
            <select onChange={e => setSelectedModel(e.target.value)}>
                {options.map((option, index) => (
                    <option key={index} value={option}>
                        {option}
                    </option>
                ))}
            </select><br/>
            <button onClick={askGpt} disabled={prompt.length === 0}>Chat</button>
            <button onClick={extractText}>Extract Text</button>
            <button onClick={getMedicineInfo}>Get Medicine Information</button>
            <button onClick={clearHistory}>Clear</button>
            <br/>
            <input type="file" id="fileInput" multiple onChange={handleFileChange} className="hidden"/><br/>
            {prescription && (<div>
                <p>name:{prescription.name}</p>
                <p>usage:{prescription.usage}</p>
                <p>frequency:{prescription.frequency}</p>
                <p>notes:{prescription.notes}</p>
            </div>)}
            <div className="flex flex-col items-center p-4 bg-gray-100 rounded-lg shadow-md w-full max-w-md mx-auto">
                <h2 className="text-xl font-bold mb-4">Photo Capture</h2>

                {hasPermission === false && (
                    <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
                        Camera access denied. Please check your browser permissions.
                    </div>
                )}

                <div className="relative bg-black rounded-lg overflow-hidden w-full aspect-video mb-4">
                    {!capturedImage && (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
                        />
                    )}

                    {capturedImage && (
                        <img
                            src={capturedImage}
                            alt="Captured"
                            className="w-full h-full object-cover"
                        />
                    )}

                    {!isCameraActive && !capturedImage && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-gray-400 text-lg">Click "Start Camera" to begin</div>
                        </div>
                    )}

                    <canvas ref={canvasRef} className="hidden" />
                </div>

                <div className="flex gap-4">
                    {!isCameraActive && !capturedImage && (
                        <button
                            onClick={startCamera}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
                        >
                            Start Camera
                        </button>
                    )}

                    {isCameraActive && (
                        <button
                            onClick={takePhoto}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors"
                        >
                            Take Photo
                        </button>
                    )}

                    {capturedImage && (
                        <button
                            onClick={resetCapture}
                            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
                        >
                            Take New Photo
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}